'use client'

import { AuthProvider } from '@/lib/auth/client'

export function AuthProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}