'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Clock, History, Settings, UserCheck } from 'lucide-react'
import KioskModal from './KioskModal'

export interface KioskWorker {
  id: string
  name: string
  status: 'IN' | 'OUT' | 'DONE'
  lastActivity: string | null // ISO string format
}

interface KioskViewProps {
  initialWorkers: KioskWorker[]
}

export default function KioskView({ initialWorkers }: KioskViewProps) {
  const router = useRouter()
  const [selectedWorker, setSelectedWorker] = useState<KioskWorker | null>(null)

  // Helper to compute initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return (parts[0] ? parts[0].slice(0, 2) : '').toUpperCase()
  }

  // Deterministic avatar styles matching Stitch design palettes
  const getAvatarStyle = (name: string) => {
    const palettes = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-teal-100', text: 'text-teal-700' },
    ]
    let sum = 0
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i)
    }
    return palettes[sum % palettes.length]
  }

  // Helper to format ISO string to local time display on client
  const formatTimeStr = (isoString: string | null) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${minutesStr} ${ampm}`
  }

  // Refreshes the server-side fetched data
  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className='min-h-screen flex flex-col bg-background text-on-background'>
      {/* Top App Bar */}
      <header className='bg-surface-container-lowest border-b border-outline-variant fixed top-0 w-full z-40'>
        <div className='flex justify-between items-center px-6 h-16 w-full max-w-7xl mx-auto'>
          <div className='flex items-center gap-3'>
            <UserCheck className='text-on-background w-6 h-6 stroke-[2.5]' />
            <h1 className='font-bold text-xl text-primary'>Attendance Pro</h1>
          </div>
          <Link
            href='/admin/login'
            className='font-semibold text-sm text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors duration-200 active:scale-95 px-4 py-2 rounded-lg'
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Content: Worker Grid List */}
      <main className='grow pt-24 pb-28 px-6 max-w-2xl mx-auto w-full'>
        <div className='mb-6'>
          <h2 className='text-2xl font-bold text-on-surface mb-2'>
            Select Your Name
          </h2>
          <p className='text-sm text-on-surface-variant'>
            Tap your name to clock in or out for your shift.
          </p>
        </div>

        <div className='space-y-3'>
          {initialWorkers.map((worker) => {
            const avatar = getAvatarStyle(worker.name)
            const initials = getInitials(worker.name)

            // Generate secondary helper text based on status
            let helperText = 'Currently: Clocked Out'
            if (worker.status === 'IN') {
              helperText = `Clocked In at ${formatTimeStr(worker.lastActivity)}`
            } else if (worker.status === 'DONE') {
              helperText = `Finished Shift at ${formatTimeStr(worker.lastActivity)}`
            }

            return (
              <button
                key={worker.id}
                onClick={() => setSelectedWorker(worker)}
                className='w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary active:scale-[0.98] transition-all duration-150 h-[80px] text-left shadow-sm cursor-pointer animate-in fade-in slide-in-from-bottom-2'
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${avatar.bg} ${avatar.text}`}
                >
                  {initials}
                </div>
                <div className='grow'>
                  <span className='block font-semibold text-lg text-primary'>
                    {worker.name}
                  </span>
                  <span className='block text-xs text-on-surface-variant'>
                    {helperText}
                  </span>
                </div>
                <ChevronRight className='text-outline-variant w-5 h-5' />
              </button>
            )
          })}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className='fixed bottom-0 left-0 w-full z-40 flex justify-around items-center bg-surface-container-lowest border-t border-outline-variant pb-safe h-16 shadow-md'>
        <div className='flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-6 py-1 cursor-pointer'>
          <Clock className='w-5 h-5 stroke-[2.5]' />
          <span className='text-xs font-bold mt-0.5'>Tracker</span>
        </div>
        <div className='flex flex-col items-center justify-center text-on-surface-variant p-2 cursor-pointer opacity-50'>
          <History className='w-5 h-5' />
          <span className='text-xs mt-0.5'>History</span>
        </div>
        <div className='flex flex-col items-center justify-center text-on-surface-variant p-2 cursor-pointer opacity-50'>
          <Settings className='w-5 h-5' />
          <span className='text-xs mt-0.5'>Settings</span>
        </div>
      </nav>

      {/* Real Action Modal */}
      {selectedWorker && (
        <KioskModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
