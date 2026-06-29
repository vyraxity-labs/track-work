import { redirect } from 'next/navigation'
import { checkAdminAuth } from '@/app/actions/admin'
import AdminLoginForm from './AdminLoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const isAuth = await checkAdminAuth()

  if (isAuth) {
    redirect('/admin/dashboard')
  }

  return <AdminLoginForm />
}
