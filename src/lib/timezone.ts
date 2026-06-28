import { prisma } from './db'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Africa/Lagos'

/**
 * Returns the current date as a YYYY-MM-DD string in the target business timezone.
 */
export function getLocalTodayDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd')
}

/**
 * Formats a Date object as a human-readable local time (e.g. "08:15 AM") in the target timezone.
 */
export function formatToLocalTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'hh:mm a')
}

/**
 * Parses a YYYY-MM-DD date string and local time string into a standard UTC Date object.
 */
export function parseLocalToUtcDate(
  dateString: string,
  timeString: string,
): Date {
  return fromZonedTime(`${dateString} ${timeString}`, TIMEZONE)
}

/**
 * Scans the database for active shifts (where clockOut is null) that should be auto-closed.
 * An active shift is auto-closed if:
 * 1. The shift date is before today.
 * 2. The shift date is today, but the local time has passed 11:00 PM (23:00) WAT.
 *
 * Auto-closed shifts have clockOut set to 11:00 PM WAT of that calendar day and isAutoClockOut set to true.
 */
export async function resolvePendingShifts(): Promise<void> {
  try {
    const todayStr = getLocalTodayDateString()
    const now = new Date()

    // Get current hour in the local timezone (24-hour format)
    const localHour = parseInt(formatInTimeZone(now, TIMEZONE, 'HH'), 10)

    const dateFilter = localHour >= 23 ? { lte: todayStr } : { lt: todayStr }

    // Find all active shifts
    const activeAttendances = await prisma.attendance.findMany({
      where: {
        clockOut: null,
        date: dateFilter,
      },
      include: {
        worker: true,
      },
    })

    for (const attendance of activeAttendances) {
      const shiftDate = attendance.date
      const autoClockOutTime = parseLocalToUtcDate(shiftDate, '23:00:00')

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          clockOut: autoClockOutTime,
          isAutoClockOut: true,
        },
      })
      console.log(
        `[Auto-Clockout] Processed worker "${attendance.worker.name}" for date ${shiftDate}`,
      )
    }
  } catch (error) {
    console.error(
      'Error executing resolvePendingShifts self-healing routine:',
      error,
    )
  }
}
