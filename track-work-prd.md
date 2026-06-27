# PRD: Ultra-Simple PWA Attendance Tracker

## 1. Overview & Objective

A lightweight, installable Progressive Web App (PWA) built with Next.js, Prisma, and MongoDB. The application will live on the business owner’s phone as an app icon. Every morning and evening, workers will use the owner's phone to quickly log their attendance using big, color-coded buttons.

---

## 2. PWA & Deployment Requirements

* **Standalone Mode:** The app must open without browser address bars, navigation buttons, or footers, looking entirely like a native app.
* **Home Screen Icon:** A custom app icon must be configurable via a web manifest file so it looks clean on iOS and Android.
* **Frictionless Access:** The owner logs in once as an Admin, checks a "Remember Me" box, and the app stays open on the worker kiosk screen indefinitely.

---

## 3. Core Features & Simplified UX

Because the users are not tech-inclined, the app will operate in **two modes** on the same device: **Kiosk Mode** (default screen for workers) and **Admin Mode** (hidden behind a simple PIN/Password toggle).

### Screen 1: The Worker Kiosk (Main Screen)

This screen is designed to be completely foolproof. No typing required.

* **Worker Selection:** A vertical list of large, tappable buttons showing each worker's name (and optionally a simple profile photo or distinct color badge to help those with low literacy).
* **The Action Modal:** Tapping a name brings up a screen with exactly **two massive choices**:
1. **A huge Green button:** "CLOCK IN" (Only active if they haven't clocked in yet today).
2. **A huge Red button:** "CLOCK OUT" (Only active if they have clocked in but haven't clocked out yet).


* **Visual Confirmation:** Upon tapping either button, a giant green checkmark or simple "Success!" screen shows for 3 seconds before automatically resetting for the next worker.

### Screen 2: Admin Dashboard (Owner View)

Accessed via a small, discrete "Admin" button in the corner protected by a 4-digit PIN.

* **Today’s Grid:** A simple view showing who is currently "In" (Green indicator) and who is "Out" (Gray/Red indicator).
* **Simple Tallies:** A table showing total hours worked by each person this week/month.
* **Add/Remove Workers:** A basic screen to type a new worker's name to add them to the kiosk list.

---

## 4. Technical Stack & PWA Implementation

* **Framework:** Next.js (App Router).
* **PWA Integration:** `@ducanh2912/next-pwa` (or standard `manifest.json` and a Custom Service Worker setup optimized for Next.js).
* **Database:** MongoDB Atlas + Prisma ORM.
* **Key Assets Required:**
* `manifest.json` defining the application name, start URL, background colors, and display configuration (`"display": "standalone"`).
* App icons sized at `192x192` and `512x512` pixels.



---

## 5. Updated Data Model (Prisma Schema)

We need to track both the start time and end time for a single day's shift. Using a single `Attendance` document per worker per day makes tracking duration simple.

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Worker {
  id          String       @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  attendance  Attendance[]
}

model Attendance {
  id         String    @id @default(auto()) @map("_id") @db.ObjectId
  workerId   String    @db.ObjectId
  worker     Worker    @relation(fields: [workerId], references: [id], onDelete: Cascade)
  date       String    // Format: "YYYY-MM-DD" -> Single document per worker per day
  clockIn    DateTime  @default(now())
  clockOut   DateTime? // Nullable until they check out at the end of the day

  @@unique([workerId, date]) // Ensures only one record can exist per worker per calendar day
}

model Admin {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  pin      String // 4-digit pin for quick mobile access instead of a complex password
}

```

---

## 6. Crucial Business Logic for Non-Tech Users

1. **Handling Shifts Past Midnight:** The schema assumes workers clock in and out on the same calendar date. If your friend runs night shifts that cross midnight, the logic will need to check for an incomplete `clockOut` from the *previous* day instead of strictly binding it to `"YYYY-MM-DD"`.
2. **Accidental Taps:** If a worker accidentally taps "Clock In" twice, the system must recognize they are already checked in and safely block it, or show a friendly "You are already clocked in!" state.
3. **Local Time Enforcement:** Because Next.js server actions run in cloud environments (which default to UTC), the app must convert the timestamp to the business's local timezone *before* generating the `YYYY-MM-DD` string to prevent dates shifting awkwardly late at night.