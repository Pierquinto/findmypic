'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  href: string
  current?: boolean
}

export default function Breadcrumb() {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', href: '/' }
    ]

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Skip if it's a dynamic route parameter
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return
      }

      const name = getSegmentName(segment, currentPath)
      breadcrumbs.push({
        name,
        href: currentPath,
        current: index === segments.length - 1
      })
    })

    return breadcrumbs
  }

  const getSegmentName = (segment: string, fullPath: string): string => {
    // Map common segments to Italian names
    const segmentMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'search': 'Ricerca',
      'history': 'Cronologia',
      'profile': 'Profilo',
      'billing': 'Billing',
      'violations': 'Violazioni',
      'content-guardian': 'Content Guardian',
      'pricing': 'Pricing',
      'login': 'Accedi',
      'register': 'Registrati',
      'admin': 'Admin'
    }

    return segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumb on homepage
  if (pathname === '/') {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index === 0 ? (
            <Link 
              href={item.href}
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              <Home className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mx-2" />
              {item.current ? (
                <span className="text-gray-900 font-medium">{item.name}</span>
              ) : (
                <Link 
                  href={item.href}
                  className="hover:text-gray-700 transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </>
          )}
        </div>
      ))}
    </nav>
  )
}
