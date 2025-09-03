'use client'

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const { signOut } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    const handleLogout = async () => {
      await signOut()
      router.push('/login')
    }
    handleLogout()
  }, [signOut, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Logout in corso...</h1>
        <p className="text-gray-600">Verrai reindirizzato alla pagina di login</p>
      </div>
    </div>
  )
}