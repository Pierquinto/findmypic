'use client'

import { usePathname } from 'next/navigation'
import ModernNavigation from './ModernNavigation'

export default function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Non mostrare la navigazione per le pagine admin
  if (pathname.startsWith('/admin')) {
    return null
  }
  
  // Non mostrare la navigazione per le pagine di login/register
  if (pathname === '/login' || pathname === '/register') {
    return null
  }
  
  return <ModernNavigation />
}
