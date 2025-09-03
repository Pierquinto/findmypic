'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { 
  Shield,
  Search, 
  User, 
  CreditCard, 
  History, 
  Bell, 
  Menu, 
  X, 
  ChevronDown,
  Home,
  LogOut,
  Settings,
  Bookmark,
  Eye
} from 'lucide-react'
import Image from 'next/image'

interface NavigationItem {
  name: string
  href: string
  icon: any
  description?: string
  badge?: string
  requiresAuth?: boolean
}

const publicNavigationItems: NavigationItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
    description: 'Torna alla homepage'
  },
  {
    name: 'Pricing',
    href: '/pricing',
    icon: CreditCard,
    description: 'Piani e prezzi'
  }
]

const authenticatedNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Panoramica account'
  },
  {
    name: 'Ricerca',
    href: '/search',
    icon: Search,
    description: 'Nuova ricerca immagine',
    badge: 'Nuovo'
  },
  {
    name: 'Cronologia',
    href: '/dashboard/history',
    icon: History,
    description: 'Le tue ricerche passate'
  },
  {
    name: 'Violazioni',
    href: '/dashboard/violations',
    icon: Bookmark,
    description: 'Gestisci violazioni salvate'
  },
  {
    name: 'Content Guardian',
    href: '/dashboard/content-guardian',
    icon: Shield,
    description: 'Monitora i tuoi contenuti'
  },

]

export default function ModernNavigation() {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const isAuthenticated = !loading && user
  const navigationItems = isAuthenticated ? authenticatedNavigationItems : publicNavigationItems

  const getCurrentPage = () => {
    if (pathname === '/') return 'Home'
    if (pathname.startsWith('/dashboard')) return 'Dashboard'
    if (pathname.startsWith('/search')) return 'Ricerca'
    if (pathname.startsWith('/pricing')) return 'Pricing'
    if (pathname.startsWith('/login')) return 'Accedi'
    if (pathname.startsWith('/register')) return 'Registrati'
    return 'FindMyPic'
  }

  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50' 
            : 'bg-white shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <div className="flex items-center">
                <Image 
                  src="/logo.svg" 
                  alt="FindMyPic Logo" 
                  width={32} 
                  height={32}
                  className="group-hover:scale-105 transition-transform"
                />
                <span className="ml-2 text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                  FindMyPic
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              
              {/* Notifications (authenticated users only) */}
              {isAuthenticated && (
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    2
                  </span>
                </button>
              )}

              {/* User Menu / Auth Buttons */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        Free Plan
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in">
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-medium text-gray-900 truncate">{user?.email}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          Piano Free
                        </p>
                      </div>
                      
                      <div className="py-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profilo
                        </Link>
                        
                        <Link
                          href="/dashboard/billing"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <CreditCard className="h-4 w-4 mr-3" />
                          Billing
                        </Link>
                        


                        {/* Admin section - to be implemented with user metadata */}
                        {false && (
                          <Link
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="h-4 w-4 mr-3" />
                            Admin Panel
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={async () => {
                            setUserMenuOpen(false)
                            await signOut()
                            window.location.href = '/'
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link 
                    href="/login" 
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Accedi
                  </Link>
                  <Link 
                    href="/register" 
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Registrati
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500">{item.description}</div>
                      )}
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}
