import KioskView from '@/app/components/KioskView'
import { getKioskWorkers } from '@/app/actions/attendance'

// Force dynamic rendering to ensure fresh attendance logs on every load
export const dynamic = 'force-dynamic'

export default async function Home() {
  const workers = await getKioskWorkers()

  return <KioskView initialWorkers={workers} />
}
