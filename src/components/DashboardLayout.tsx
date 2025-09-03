'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Breadcrumb from './Breadcrumb'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export default function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) return // Still loading
    
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  if (!loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-gray-600 text-lg">
                {description}
              </p>
            )}
          </div>
        )}
        
        {children}
      </main>
    </div>
  )
}