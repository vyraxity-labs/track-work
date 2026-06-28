import { PrismaClient } from '@prisma/client'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { resolvePendingShifts } from '../src/lib/timezone'

const prisma = new PrismaClient()
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Africa/Lagos'

async function runTest() {
  console.log('=== STARTING TIMEZONE & AUTO-CLOCKOUT TESTS ===')

  // 1. Create a temporary worker to avoid relying on seed data or mutating existing records
  const worker = await prisma.worker.create({
    data: { name: 'Test Temp Worker' },
  })
  console.log(`- Created temporary worker: ${worker.name} (ID: ${worker.id})`)

  try {
    // 2. Compute yesterday's date string relative to Lagos
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayStr = formatInTimeZone(yesterday, TIMEZONE, 'yyyy-MM-dd')
    console.log(`- Yesterday date string in Lagos: ${yesterdayStr}`)

    // 3. Create an incomplete shift for yesterday (simulates forgetting to clock out)
    const mockClockInTime = fromZonedTime(`${yesterdayStr} 08:00:00`, TIMEZONE)
    const mockShift = await prisma.attendance.create({
      data: {
        workerId: worker.id,
        date: yesterdayStr,
        clockIn: mockClockInTime,
        clockOut: null,
        isAutoClockOut: false,
      },
    })
    console.log(`- Created mock incomplete attendance record:`)
    console.log(`  ID: ${mockShift.id}`)
    console.log(`  Date: ${mockShift.date}`)
    console.log(`  ClockIn (UTC): ${mockShift.clockIn.toISOString()}`)
    console.log(`  ClockOut: ${mockShift.clockOut}`)
    console.log(`  isAutoClockOut: ${mockShift.isAutoClockOut}`)

    // 4. Run the self-healing routine
    console.log('- Running resolvePendingShifts self-healing routine...')
    await resolvePendingShifts()

    // 5. Retrieve the record and verify assertions
    const updatedShift = await prisma.attendance.findUnique({
      where: { id: mockShift.id },
    })

    if (!updatedShift) {
      throw new Error('Mock attendance record was deleted unexpectedly!')
    }

    console.log('- Retrieving updated attendance record:')
    console.log(`  ClockOut (UTC): ${updatedShift.clockOut?.toISOString()}`)
    console.log(`  isAutoClockOut: ${updatedShift.isAutoClockOut}`)

    // Assertion 1: clockOut must be set
    if (updatedShift.clockOut === null) {
      throw new Error('Assertion failed: clockOut is still null!')
    }

    // Assertion 2: isAutoClockOut must be true
    if (updatedShift.isAutoClockOut !== true) {
      throw new Error('Assertion failed: isAutoClockOut is not true!')
    }

    // Assertion 3: clockOut must correspond to 11:00 PM (23:00) WAT of yesterday
    const expectedUtcTime = fromZonedTime(`${yesterdayStr} 23:00:00`, TIMEZONE)
    if (updatedShift.clockOut.getTime() !== expectedUtcTime.getTime()) {
      throw new Error(
        `Assertion failed: Expected clockOut to be ${expectedUtcTime.toISOString()} but got ${updatedShift.clockOut.toISOString()}`,
      )
    }

    console.log('\n✓ ALL ASSERTIONS PASSED SUCCESSFULLY!')
  } finally {
    // Cleanup temporary worker (cascades to delete attendance records)
    await prisma.worker.delete({
      where: { id: worker.id },
    })
    console.log(
      '- Cleaned up temporary worker and associated attendance records.',
    )
    console.log('=== TESTS COMPLETED SUCCESSFULLY ===')
  }
}

runTest()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
