import { PrismaClient } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { resolvePendingShifts } from "../src/lib/timezone";

const prisma = new PrismaClient();
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Africa/Lagos";

async function runTest() {
  console.log("=== STARTING TIMEZONE & AUTO-CLOCKOUT TESTS ===");
  
  // 1. Fetch a worker
  const worker = await prisma.worker.findFirst({
    where: { name: "Marcus Henderson" }
  });
  
  if (!worker) {
    throw new Error("Worker 'Marcus Henderson' not found. Please run seed script first.");
  }
  console.log(`- Selected worker: ${worker.name} (ID: ${worker.id})`);

  // 2. Compute yesterday's date string relative to Lagos
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatInTimeZone(yesterday, TIMEZONE, "yyyy-MM-dd");
  console.log(`- Yesterday date string in Lagos: ${yesterdayStr}`);

  // 3. Ensure no existing record exists for yesterday
  await prisma.attendance.deleteMany({
    where: {
      workerId: worker.id,
      date: yesterdayStr,
    }
  });

  // 4. Create an incomplete shift for yesterday (simulates forgetting to clock out)
  const mockClockInTime = fromZonedTime(`${yesterdayStr} 08:00:00`, TIMEZONE);
  const mockShift = await prisma.attendance.create({
    data: {
      workerId: worker.id,
      date: yesterdayStr,
      clockIn: mockClockInTime,
      clockOut: null,
      isAutoClockOut: false,
    }
  });
  console.log(`- Created mock incomplete attendance record:`);
  console.log(`  ID: ${mockShift.id}`);
  console.log(`  Date: ${mockShift.date}`);
  console.log(`  ClockIn (UTC): ${mockShift.clockIn.toISOString()}`);
  console.log(`  ClockOut: ${mockShift.clockOut}`);
  console.log(`  isAutoClockOut: ${mockShift.isAutoClockOut}`);

  // 5. Run the self-healing routine
  console.log("- Running resolvePendingShifts self-healing routine...");
  await resolvePendingShifts();

  // 6. Retrieve the record and verify assertions
  const updatedShift = await prisma.attendance.findUnique({
    where: { id: mockShift.id }
  });

  if (!updatedShift) {
    throw new Error("Mock attendance record was deleted unexpectedly!");
  }

  console.log("- Retrieving updated attendance record:");
  console.log(`  ClockOut (UTC): ${updatedShift.clockOut?.toISOString()}`);
  console.log(`  isAutoClockOut: ${updatedShift.isAutoClockOut}`);

  // Assertion 1: clockOut must be set
  if (updatedShift.clockOut === null) {
    throw new Error("Assertion failed: clockOut is still null!");
  }

  // Assertion 2: isAutoClockOut must be true
  if (updatedShift.isAutoClockOut !== true) {
    throw new Error("Assertion failed: isAutoClockOut is not true!");
  }

  // Assertion 3: clockOut must correspond to 11:00 PM (23:00) WAT of yesterday
  const expectedUtcTime = fromZonedTime(`${yesterdayStr} 23:00:00`, TIMEZONE);
  if (updatedShift.clockOut.getTime() !== expectedUtcTime.getTime()) {
    throw new Error(`Assertion failed: Expected clockOut to be ${expectedUtcTime.toISOString()} but got ${updatedShift.clockOut.toISOString()}`);
  }

  console.log("\n✓ ALL ASSERTIONS PASSED SUCCESSFULLY!");
  
  // 7. Cleanup mock data
  await prisma.attendance.delete({
    where: { id: mockShift.id }
  });
  console.log("- Cleaned up mock attendance record.");
  console.log("=== TESTS COMPLETED SUCCESSFULLY ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ TEST FAILED:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
