'use client'

import { useState, useTransition } from 'react'
import { X, Timer, TimerOff, Check } from 'lucide-react'
import { clockIn, clockOut } from '@/app/actions/attendance'
import { KioskWorker } from './KioskView'

interface KioskModalProps {
  worker: KioskWorker
  onClose: () => void
  onSuccess: () => void
}

export default function KioskModal({
  worker,
  onClose,
  onSuccess,
}: KioskModalProps) {
  const [isPending, startTransition] = useTransition()
  const [successAction, setSuccessAction] = useState<'IN' | 'OUT' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Helper to compute initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return (parts[0] ? parts[0].slice(0, 2) : '').toUpperCase()
  }

  // Deterministic avatar styles matching KioskView
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

  const handleClockIn = () => {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await clockIn(worker.id)
        if (res.success) {
          setSuccessAction('IN')
          setTimeout(() => {
            onSuccess()
            onClose()
          }, 3000)
        } else {
          setErrorMsg(res.error || 'An error occurred.')
        }
      } catch (err) {
        setErrorMsg('A network error occurred. Please try again.')
      }
    })
  }

  const handleClockOut = () => {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await clockOut(worker.id)
        if (res.success) {
          setSuccessAction('OUT')
          setTimeout(() => {
            onSuccess()
            onClose()
          }, 3000)
        } else {
          setErrorMsg(res.error || 'An error occurred.')
        }
      } catch (err) {
        setErrorMsg('A network error occurred. Please try again.')
      }
    })
  }

  const avatar = getAvatarStyle(worker.name)
  const initials = getInitials(worker.name)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-6'>
      {/* Backdrop blur */}
      <div
        className='absolute inset-0 bg-on-background/60 backdrop-blur-sm transition-opacity duration-300'
        onClick={!isPending && !successAction ? onClose : undefined}
      ></div>

      {/* Modal Container */}
      <div className='relative bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 border border-outline-variant animate-in slide-in-from-bottom-10 duration-200'>
        {/* Close Button */}
        {!isPending && !successAction && (
          <button
            className='absolute top-4 right-4 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors p-2 rounded-full cursor-pointer'
            onClick={onClose}
          >
            <X className='w-6 h-6' />
          </button>
        )}

        {/* 1. Main Action View */}
        {!successAction && (
          <div className='flex flex-col items-center'>
            {/* Worker Avatar & Name */}
            <div className='flex flex-col items-center mb-8 pt-4'>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl mb-4 ${avatar.bg} ${avatar.text}`}
              >
                {initials}
              </div>
              <h3 className='text-2xl font-bold text-on-surface text-center'>
                {worker.name}
              </h3>
              <p className='text-sm text-on-surface-variant mt-1'>
                Choose your action for today
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className='w-full mb-6 p-4 bg-error-container text-error rounded-xl text-sm font-semibold border border-error/20'>
                {errorMsg}
              </div>
            )}

            {/* Huge Clock In & Clock Out Buttons */}
            <div className='grid grid-cols-1 gap-4 w-full'>
              {/* Clock In */}
              <button
                disabled={worker.status !== 'OUT' || isPending}
                onClick={handleClockIn}
                className={`flex flex-col items-center justify-center gap-2 h-[160px] rounded-xl transition-all duration-150 font-bold border-2 cursor-pointer
                  ${
                    worker.status === 'OUT' && !isPending
                      ? 'bg-secondary text-on-secondary border-secondary active:scale-[0.97] hover:opacity-90'
                      : 'bg-surface-container text-on-surface-variant/40 border-outline-variant/30 cursor-not-allowed opacity-50'
                  }`}
              >
                <Timer className='w-12 h-12 stroke-[2.5]' />
                <span className='text-xl tracking-wider uppercase'>
                  CLOCK IN
                </span>
              </button>

              {/* Clock Out */}
              <button
                disabled={worker.status !== 'IN' || isPending}
                onClick={handleClockOut}
                className={`flex flex-col items-center justify-center gap-2 h-[160px] rounded-xl transition-all duration-150 font-bold border-2 cursor-pointer
                  ${
                    worker.status === 'IN' && !isPending
                      ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container active:scale-[0.97] hover:opacity-90'
                      : 'bg-surface-container text-on-surface-variant/40 border-outline-variant/30 cursor-not-allowed opacity-50'
                  }`}
              >
                <TimerOff className='w-12 h-12 stroke-[2.5]' />
                <span className='text-xl tracking-wider uppercase'>
                  CLOCK OUT
                </span>
              </button>
            </div>

            {/* Status note if they are fully finished */}
            {worker.status === 'DONE' && (
              <p className='mt-6 text-sm text-secondary font-semibold text-center'>
                ✓ You have successfully completed your shift for today.
              </p>
            )}
          </div>
        )}

        {/* 2. Success Feedback Screen */}
        {successAction && (
          <div className='flex flex-col items-center justify-center py-12 animate-in fade-in duration-500 text-center'>
            <div className='w-24 h-24 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mb-6 success-checkmark shadow-md'>
              <Check className='w-14 h-14 stroke-3' />
            </div>
            <h3 className='text-3xl font-extrabold text-on-surface mb-2'>
              Success!
            </h3>
            <p className='text-lg text-on-surface-variant'>
              You have successfully clocked{' '}
              {successAction === 'IN' ? 'in' : 'out'}.
            </p>
            <p className='text-xs text-on-surface-variant mt-10 italic animate-pulse'>
              Returning to list...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
