'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Delete, X, ArrowLeft } from 'lucide-react'
import { loginAdmin } from '@/app/actions/admin'

export default function AdminLoginForm() {
  const router = useRouter()
  const [pin, setPin] = useState<string>('')
  const [rememberMe, setRememberMe] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset PIN on error change or load
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit(pin)
    }
  }, [pin])

  const handlePinSubmit = (enteredPin: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await loginAdmin(enteredPin, rememberMe)
      if (res.success) {
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        setErrorMsg(res.error || 'Incorrect PIN.')
        setPin('') // Reset PIN to let them re-try
      }
    })
  }

  const handleNumberClick = (num: number) => {
    if (pin.length < 4 && !isPending) {
      setPin((prev) => prev + num)
      setErrorMsg(null)
    }
  }

  const handleBackspace = () => {
    if (pin.length > 0 && !isPending) {
      setPin((prev) => prev.slice(0, -1))
    }
  }

  const handleClear = () => {
    if (!isPending) {
      setPin('')
      setErrorMsg(null)
    }
  }

  return (
    <div className='min-h-screen flex flex-col justify-between bg-background text-on-background py-8 px-6'>
      {/* Header & Back Button */}
      <header className='max-w-md w-full mx-auto flex items-center justify-between'>
        <Link
          href='/'
          className='flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer'
        >
          <ArrowLeft className='w-4 h-4 stroke-[2.5]' />
          <span>Kiosk Screen</span>
        </Link>
        <span className='text-xs font-bold uppercase tracking-wider text-on-surface-variant opacity-60'>
          Admin Gate
        </span>
      </header>

      {/* Center Block: Pad & Inputs */}
      <main className='max-w-md w-full mx-auto flex flex-col items-center justify-center my-auto'>
        <div className='flex flex-col items-center mb-6'>
          <div className='w-16 h-16 bg-surface-container-high text-primary rounded-full flex items-center justify-center mb-4 border border-outline-variant shadow-inner'>
            <Lock className='w-6 h-6 stroke-[2.5]' />
          </div>
          <h2 className='text-2xl font-extrabold text-primary'>Admin Login</h2>
          <p className='text-sm text-on-surface-variant mt-1 text-center'>
            Enter the 4-digit administrator PIN
          </p>
        </div>

        {/* Display Dots */}
        <div className='flex gap-5 mb-8'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full transition-all duration-200 border-2
                ${
                  pin.length > i
                    ? 'bg-primary border-primary scale-110 shadow-md'
                    : 'bg-surface-container-lowest border-outline-variant'
                }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className='w-full mb-6 p-3 bg-error-container text-error rounded-xl text-center text-sm font-semibold border border-error/10 animate-in fade-in duration-200'>
            {errorMsg}
          </div>
        )}

        {/* PIN Pad Grid */}
        <div className='grid grid-cols-3 gap-y-4 gap-x-8 mb-8 justify-items-center'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              disabled={isPending}
              onClick={() => handleNumberClick(num)}
              className='w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-2xl border border-outline-variant bg-surface-container-lowest text-primary hover:border-primary active:bg-surface-container transition-all duration-100 cursor-pointer shadow-sm disabled:opacity-50'
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            disabled={isPending}
            onClick={handleClear}
            className='w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50'
            title='Clear'
          >
            <X className='w-6 h-6 stroke-[2.5]' />
          </button>

          {/* Zero Button */}
          <button
            disabled={isPending}
            onClick={() => handleNumberClick(0)}
            className='w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-2xl border border-outline-variant bg-surface-container-lowest text-primary hover:border-primary active:bg-surface-container transition-all duration-100 cursor-pointer shadow-sm disabled:opacity-50'
          >
            0
          </button>

          {/* Delete/Backspace Button */}
          <button
            disabled={isPending}
            onClick={handleBackspace}
            className='w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50'
            title='Backspace'
          >
            <Delete className='w-6 h-6 stroke-2' />
          </button>
        </div>

        {/* Remember Me Toggle */}
        <div className='flex items-center justify-between w-full p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm'>
          <div className='flex flex-col'>
            <span className='font-bold text-sm text-primary'>Remember Me</span>
            <span className='text-xs text-on-surface-variant'>
              Stay signed in indefinitely
            </span>
          </div>
          <button
            type='button'
            onClick={() => setRememberMe(!rememberMe)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer
              ${rememberMe ? 'bg-secondary' : 'bg-outline-variant'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                ${rememberMe ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className='max-w-md w-full mx-auto text-center mt-6'>
        <p className='text-xs text-on-surface-variant opacity-60'>
          Attendance Pro • Version 1.0 (Stable)
        </p>
      </footer>
    </div>
  )
}
