'use client'

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Search, 
  CreditCard, 
  History, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Bookmark
} from 'lucide-react'

type DashboardData = {
  user: {
    plan: string
    searches: number
    maxSearches: number
    email: string
  }
  recentSearches: any[]
  protectedAssets: {
    total: number
    active: number
    violations: number
  }
  stats: {
    totalSearches: number
    violationsFound: number
    lastSearchDate?: string
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading  } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session, status, router])

  const fetchDashboardData = async () => {
    try {
      // Fetch user info
      const userResponse = await fetch('/api/user/billing')
      const userData = userResponse.ok ? await userResponse.json() : null

      // Fetch recent searches
      const searchResponse = await fetch('/api/user/search-history?limit=5')
      const searchData = searchResponse.ok ? await searchResponse.json() : { searches: [] }

      // Fetch protected assets
      const assetsResponse = await fetch('/api/user/protected-assets')
      const assetsData = assetsResponse.ok ? await assetsResponse.json() : { assets: [], stats: {} }

      setDashboardData({
        user: {
          plan: userData?.currentPlan || 'free',
          searches: userData?.searches || 0,
          maxSearches: userData?.maxSearches || 1,
          email: user?.email || ''
        },
        recentSearches: searchData.searches || [],
        protectedAssets: {
          total: assetsData.stats?.totalAssets || 0,
          active: assetsData.stats?.activeMonitoring || 0,
          violations: assetsData.stats?.totalViolations || 0
        },
        stats: {
          totalSearches: searchData.pagination?.total || 0,
          violationsFound: (searchData.searches || []).reduce((acc: number, search: any) => acc + (search.resultsCount || 0), 0),
          lastSearchDate: (searchData.searches || [])[0]?.createdAt
        }
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Set fallback data
      setDashboardData({
        user: {
          plan: (user as any)?.plan || 'free',
          searches: 0,
          maxSearches: 1,
          email: user?.email || ''
        },
        recentSearches: [],
        protectedAssets: { total: 0, active: 0, violations: 0 },
        stats: { totalSearches: 0, violationsFound: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuito'
      case 'basic': return 'Basic'
      case 'pro': return 'Pro'
      default: return 'Gratuito'
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'text-gray-600 bg-gray-100'
      case 'basic': return 'text-blue-600 bg-blue-100'
      case 'pro': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading || !authLoading && user) {
    return (
      <DashboardLayout title="Dashboard" description="Panoramica del tuo account e attività">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || !dashboardData) {
    return null
  }

  return (
    <DashboardLayout title="Dashboard" description="Panoramica del tuo account e attività">
      <div className="space-y-6">
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Piano Attuale</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {getPlanName(dashboardData.user.plan)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Ricerche utilizzate</span>
                <span className="font-medium">
                  {dashboardData.user.searches} / {dashboardData.user.maxSearches === 999 ? '∞' : dashboardData.user.maxSearches}
                </span>
              </div>
              {dashboardData.user.maxSearches !== 999 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{width: `${Math.min((dashboardData.user.searches / dashboardData.user.maxSearches) * 100, 100)}%`}}
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Total Searches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Ricerche Totali</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalSearches}</p>
              </div>
            </div>
          </div>

          {/* Violations Found */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Violazioni Trovate</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.stats.violationsFound}</p>
              </div>
            </div>
          </div>

          {/* Protected Assets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Asset Protetti</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.protectedAssets.total}</p>
                <p className="text-xs text-green-600">{dashboardData.protectedAssets.active} attivi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Azioni Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link 
              href="/search" 
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <Search className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-700">Nuova Ricerca</h3>
                <p className="text-sm text-gray-500">Scansiona una nuova immagine</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/violations" 
              className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group"
            >
              <Bookmark className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-red-700">Violazioni</h3>
                <p className="text-sm text-gray-500">Gestisci violazioni salvate</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/content-guardian" 
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <Shield className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Content Guardian</h3>
                <p className="text-sm text-gray-500">Monitora i tuoi asset</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/history" 
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <History className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Cronologia</h3>
                <p className="text-sm text-gray-500">Visualizza ricerche passate</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/billing" 
              className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
            >
              <CreditCard className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-yellow-700">Billing</h3>
                <p className="text-sm text-gray-500">Gestisci abbonamento</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Searches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ricerche Recenti</h3>
              <Link 
                href="/dashboard/history" 
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Visualizza tutte
              </Link>
            </div>
            
            {dashboardData.recentSearches.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentSearches.slice(0, 3).map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {search.resultsCount > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {search.resultsCount > 0 
                            ? `${search.resultsCount} risultati trovati`
                            : 'Nessuna violazione'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(search.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Nessuna ricerca effettuata</p>
                <Link 
                  href="/search" 
                  className="inline-flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Inizia Prima Ricerca
                </Link>
              </div>
            )}
          </div>

          {/* Account Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Account</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Piano</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(dashboardData.user.plan)}`}>
                  {getPlanName(dashboardData.user.plan)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email</span>
                <span className="text-sm text-gray-900">{dashboardData.user.email}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Asset Monitorati</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboardData.protectedAssets.active} di {dashboardData.protectedAssets.total}
                </span>
              </div>
              
              {dashboardData.stats.lastSearchDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ultima Ricerca</span>
                  <span className="text-sm text-gray-900">
                    {new Date(dashboardData.stats.lastSearchDate).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link 
                href="/dashboard/profile" 
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors text-sm"
              >
                Gestisci Profilo
              </Link>
            </div>
          </div>
        </div>

        {/* Upgrade Banner for Free Users */}
        {dashboardData.user.plan === 'free' && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-xl font-semibold mb-2">
                  Sblocca il pieno potenziale di FindMyPic
                </h3>
                <p className="text-purple-100 mb-4">
                  Aggiorna al piano Basic per 10 ricerche al mese e Content Guardian
                </p>
                <ul className="space-y-1 text-sm text-purple-100">
                  <li>✓ 10 ricerche mensili</li>
                  <li>✓ Content Guardian per monitoraggio automatico</li>
                  <li>✓ Cronologia completa e export</li>
                  <li>✓ Supporto prioritario</li>
                </ul>
              </div>
              <div className="flex flex-col space-y-2">
                <Link 
                  href="/dashboard/billing" 
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors text-center"
                >
                  Aggiorna Piano
                </Link>
                <span className="text-purple-200 text-xs text-center">A partire da €9.99/mese</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}