'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client';
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Activity,
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Database,
  Globe,
  Zap,
  AlertTriangle,
  TrendingUp,
  FileText,
  Download,
  Shield
} from 'lucide-react'
import Image from 'next/image'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  name: string
  href: string
  icon: any
  badge?: string
  badgeColor?: string
  subItems?: Array<{
    name: string
    href: string
    icon: any
  }>
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications, setNotifications] = useState(3)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['analytics'])

  useEffect(() => {
    if (loading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }
  }, [user, loading, router])

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      badge: 'new',
      badgeColor: 'bg-green-500'
    },
    {
      name: 'Utenti',
      href: '/admin/users',
      icon: Users,
      subItems: [
        { name: 'Gestione Utenti', href: '/admin/users', icon: Users },
        { name: 'Ruoli e Permessi', href: '/admin/users/roles', icon: Shield },
        { name: 'Attività Utenti', href: '/admin/users/activity', icon: Activity }
      ]
    },
    {
      name: 'Abbonamenti',
      href: '/admin/subscriptions',
      icon: CreditCard,
      subItems: [
        { name: 'Gestione Abbonamenti', href: '/admin/subscriptions', icon: CreditCard },
        { name: 'Fatturazione', href: '/admin/subscriptions/billing', icon: FileText },
        { name: 'Report Finanziari', href: '/admin/subscriptions/reports', icon: TrendingUp }
      ]
    },
    {
      name: 'Ricerche',
      href: '/admin/searches',
      icon: Search,
      subItems: [
        { name: 'Tutte le Ricerche', href: '/admin/searches', icon: Search },
        { name: 'Log Dettagliati', href: '/admin/search-logs', icon: FileText },
        { name: 'Immagini Caricate', href: '/admin/searches/images', icon: Database },
        { name: 'Ricerche Fallite', href: '/admin/searches/failed', icon: AlertTriangle }
      ]
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      subItems: [
        { name: 'Overview', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Metriche Utenti', href: '/admin/analytics/users', icon: Users },
        { name: 'Performance Ricerche', href: '/admin/analytics/searches', icon: Search },
        { name: 'Analisi Conversioni', href: '/admin/analytics/conversions', icon: TrendingUp }
      ]
    },
    {
      name: 'Sistema',
      href: '/admin/system',
      icon: Settings,
      badge: notifications > 0 ? notifications.toString() : undefined,
      badgeColor: 'bg-red-500',
      subItems: [
        { name: 'Configurazioni', href: '/admin/settings', icon: Settings },
        { name: 'Provider Search', href: '/admin/system/providers', icon: Globe },
        { name: 'Monitoraggio', href: '/admin/system/monitoring', icon: Activity },
        { name: 'Backup & Export', href: '/admin/system/backup', icon: Download }
      ]
    },
    {
      name: 'Logs',
      href: '/admin/logs',
      icon: FileText,
      subItems: [
        { name: 'System Logs', href: '/admin/logs', icon: FileText },
        { name: 'Error Logs', href: '/admin/logs/errors', icon: AlertTriangle },
        { name: 'Security Logs', href: '/admin/logs/security', icon: Shield }
      ]
    }
  ]

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    )
  }

  const isActiveMenu = (href: string, subItems?: any[]) => {
    if (pathname === href) return true
    if (subItems) {
      return subItems.some(item => pathname === item.href)
    }
    return false
  }

  const isActiveSubItem = (href: string) => pathname === href

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile?.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-64' : 'w-16'
      } bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col shadow-sm`}>
        
        {/* Logo Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          {sidebarOpen && (
            <div className="flex items-center">
              <Image 
                src="/logo.svg" 
                alt="FindMyPic Logo" 
                width={32} 
                height={32}
                className="mr-2"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">FindMyPic</h1>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <div key={item.name}>
              <div
                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isActiveMenu(item.href, item.subItems)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Link 
                  href={item.subItems ? '#' : item.href}
                  className="flex items-center flex-1"
                  onClick={(e) => {
                    if (item.subItems) {
                      e.preventDefault()
                      toggleMenu(item.name)
                    }
                  }}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-2 px-1.5 py-0.5 text-xs font-semibold text-white rounded-full ${item.badgeColor || 'bg-gray-500'}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {item.subItems && sidebarOpen && (
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="ml-2 p-0.5"
                  >
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.includes(item.name) ? 'transform rotate-180' : ''
                      }`} 
                    />
                  </button>
                )}
              </div>
              
              {/* Submenu */}
              {item.subItems && sidebarOpen && expandedMenus.includes(item.name) && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        isActiveSubItem(subItem.href)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <subItem.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-200">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <Link
                href="/logout"
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-slate-600" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <Link
                href="/logout"
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-slate-600" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {pathname === '/admin' && 'Dashboard'}
                {pathname === '/admin/users' && 'Gestione Utenti'}
                {pathname === '/admin/subscriptions' && 'Abbonamenti'}
                {pathname === '/admin/searches' && 'Gestione Ricerche'}
                {pathname === '/admin/search-logs' && 'Log Ricerche Dettagliati'}
                {pathname === '/admin/analytics' && 'Analytics'}
                {pathname === '/admin/settings' && 'Configurazioni'}
                {pathname === '/admin/logs' && 'System Logs'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Quick Actions */}
              <Link 
                href="/" 
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Vai al Sito
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}