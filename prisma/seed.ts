import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding started...')

  // 1. Seed Admin
  const adminCount = await prisma.admin.count()
  if (adminCount === 0) {
    const defaultPin = process.env.ADMIN_PIN || '1234'
    const hashedPin = bcrypt.hashSync(defaultPin, 10)
    await prisma.admin.create({
      data: {
        pin: hashedPin,
      },
    })
    console.log(`- Created default Admin with PIN: ${defaultPin}`)
  } else {
    console.log('- Admin PIN already exists. Skipping.')
  }

  // 2. Seed Workers
  const defaultWorkers = [
    { name: 'Marcus Henderson' },
    { name: 'Elena Rodriguez' },
    { name: 'Samir Gupta' },
    { name: 'Jessica Lee' },
    { name: 'David Chen' },
  ]

  console.log('- Seeding workers...')
  const existingWorkers = await prisma.worker.findMany({
    where: {
      name: { in: defaultWorkers.map((w) => w.name) },
    },
    select: { name: true },
  })

  const existingNames = new Set(existingWorkers.map((w) => w.name))
  const workersToCreate = defaultWorkers.filter(
    (w) => !existingNames.has(w.name),
  )

  if (workersToCreate.length > 0) {
    await prisma.worker.createMany({
      data: workersToCreate.map((w) => ({
        name: w.name,
        isActive: true,
      })),
    })
    for (const w of workersToCreate) {
      console.log(`  + Created worker: ${w.name}`)
    }
  }

  for (const w of defaultWorkers) {
    if (existingNames.has(w.name)) {
      console.log(`  o Worker ${w.name} already exists. Skipping.`)
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
