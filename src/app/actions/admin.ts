"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export interface LoginResponse {
  success: boolean;
  error?: string;
}

/**
 * Validates the admin PIN and sets an HTTP-only cookie session.
 * Enforces "Remember Me" by configuring the cookie lifespan up to 10 years.
 */
export async function loginAdmin(pin: string, rememberMe: boolean): Promise<LoginResponse> {
  try {
    const admin = await prisma.admin.findFirst();
    if (!admin) {
      return { 
        success: false, 
        error: "Database has no administrator seeded. Please run the seed command." 
      };
    }

    const isValid = bcrypt.compareSync(pin, admin.pin);
    if (!isValid) {
      return { 
        success: false, 
        error: "Incorrect PIN. Please try again." 
      };
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      // Set to 10 years if "Remember Me" is checked, otherwise session-bound
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 365 * 10 } : {}),
    });

    return { success: true };
  } catch (error) {
    console.error("Error in loginAdmin server action:", error);
    return { 
      success: false, 
      error: "An internal server error occurred." 
    };
  }
}

/**
 * Checks if the current request is authenticated as Admin.
 */
export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}

/**
 * Clears the admin session cookie, logging the user out.
 */
export async function logoutAdmin(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return { success: true };
}
