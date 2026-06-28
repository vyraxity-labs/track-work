"use server";

import { prisma } from "@/lib/db";
import { getLocalTodayDateString, resolvePendingShifts } from "@/lib/timezone";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Fetches all active workers along with their attendance record for today.
 * Executes the lazy self-healing routine first to ensure status is up to date.
 */
export async function getKioskWorkers() {
  await resolvePendingShifts();
  
  const todayStr = getLocalTodayDateString();
  
  const workers = await prisma.worker.findMany({
    where: {
      isActive: true,
    },
    include: {
      attendance: {
        where: {
          date: todayStr,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return workers.map((worker) => {
    const todayAttendance = worker.attendance[0] || null;
    
    // Status can be: 'OUT' (not clocked in yet), 'IN' (clocked in but not out), 'DONE' (clocked in & out)
    let status: "IN" | "OUT" | "DONE" = "OUT";
    let lastActivity: string | null = null;

    if (todayAttendance) {
      if (todayAttendance.clockOut === null) {
        status = "IN";
        lastActivity = todayAttendance.clockIn.toISOString();
      } else {
        status = "DONE";
        lastActivity = todayAttendance.clockOut.toISOString();
      }
    }

    return {
      id: worker.id,
      name: worker.name,
      status,
      lastActivity,
      todayAttendance,
    };
  });
}

/**
 * Clocks a worker in for today.
 * Atomic check prevents double clock-ins from accidental double clicks.
 */
export async function clockIn(workerId: string): Promise<ActionResponse> {
  try {
    // 1. Run lazy self-healing check
    await resolvePendingShifts();

    const todayStr = getLocalTodayDateString();

    // 2. Fetch inside a transaction or check existing record
    const existing = await prisma.attendance.findUnique({
      where: {
        workerId_date: {
          workerId,
          date: todayStr,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "You are already clocked in for today.",
      };
    }

    // 3. Create clock-in record
    await prisma.attendance.create({
      data: {
        workerId,
        date: todayStr,
        clockIn: new Date(),
        isAutoClockOut: false,
      },
    });

    // Revalidate paths to refresh client states
    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error in clockIn action:", error);
    return {
      success: false,
      error: "A database error occurred. Please try again.",
    };
  }
}

/**
 * Clocks a worker out for today.
 * Prevents double clock-outs or clocking out without a clock-in.
 */
export async function clockOut(workerId: string): Promise<ActionResponse> {
  try {
    // 1. Run lazy self-healing check
    await resolvePendingShifts();

    const todayStr = getLocalTodayDateString();

    // 2. Check existing record
    const existing = await prisma.attendance.findUnique({
      where: {
        workerId_date: {
          workerId,
          date: todayStr,
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "No clock-in record found for today. You must clock in first.",
      };
    }

    if (existing.clockOut !== null) {
      return {
        success: false,
        error: "You are already clocked out for today.",
      };
    }

    // 3. Update record with clock-out time
    await prisma.attendance.update({
      where: {
        id: existing.id,
      },
      data: {
        clockOut: new Date(),
      },
    });

    // Revalidate paths to refresh client states
    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error in clockOut action:", error);
    return {
      success: false,
      error: "A database error occurred. Please try again.",
    };
  }
}
