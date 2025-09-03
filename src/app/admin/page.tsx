'use client'

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Activity, 
  Search,
  Shield,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  Database,
  Zap,
  Globe,
  Eye,
  Target,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface DashboardStats {
  users: {
    total: number
    new: number
    active: number
    growth: number
    plans: { free: number; basic: number; pro: number }
  }
  searches: {
    total: number
    today: number
    thisWeek: number
    avgPerUser: number
    successRate: number
    avgResponseTime: number
  }
  revenue: {
    monthly: number
    total: number
    growth: number
    mrr: number
    churnRate: number
    arpu: number
  }
  system: {
    uptime: string
    providers: number
    errors: number
    cpu: number
    memory: number
    storage: number
    activeConnections: number
  }
}

export default function AdminDashboard() {
  const { user, userProfile, loading: authLoading  } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchDashboardStats()
  }, [user, authLoading, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user || !(user as any).isAdmin) {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Utenti Totali</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stats ? stats.users.total.toLocaleString() : '---'}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {stats && stats.users.growth > 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`font-medium ${stats && stats.users.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats ? `${stats.users.growth > 0 ? '+' : ''}${stats.users.growth.toFixed(1)}%` : '---'}
                  </span>
                  <span className="text-slate-500 ml-1">vs mese scorso</span>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">MRR</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  €{stats ? stats.revenue.mrr.toLocaleString() : '---'}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {stats && stats.revenue.growth > 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`font-medium ${stats && stats.revenue.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats ? `${stats.revenue.growth > 0 ? '+' : ''}${stats.revenue.growth.toFixed(1)}%` : '---'}
                  </span>
                  <span className="text-slate-500 ml-1">crescita</span>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Searches Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Ricerche Oggi</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stats ? stats.searches.today.toLocaleString() : '---'}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  <Target className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-purple-600 font-medium">
                    {stats ? `${stats.searches.successRate}%` : '---'}
                  </span>
                  <span className="text-slate-500 ml-1">success rate</span>
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <Search className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">System Health</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.system.uptime || '---'}</p>
                <div className="flex items-center mt-2 text-sm">
                  {stats && stats.system.errors === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`font-medium ${stats && stats.system.errors === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats ? (stats.system.errors === 0 ? 'Tutto OK' : `${stats.system.errors} errori`) : '---'}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <Server className="h-8 w-8 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Performance Overview</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-slate-600">Ricerche</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-slate-600">Utenti Attivi</span>
                </div>
              </div>
            </div>
            <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Grafici di performance in tempo reale</p>
                <p className="text-xs text-slate-400 mt-1">Integrazione Chart.js in arrivo</p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-slate-700">CPU Usage</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {stats ? `${stats.system.cpu}%` : '---'}
                  </div>
                  <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats?.system.cpu || 0}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-slate-700">Memory</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {stats ? `${stats.system.memory}%` : '---'}
                  </div>
                  <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats?.system.memory || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-purple-500 mr-2" />
                  <span className="text-sm font-medium text-slate-700">Storage</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {stats ? `${stats.system.storage}%` : '---'}
                  </div>
                  <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats?.system.storage || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-slate-700">Active Connections</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {stats ? stats.system.activeConnections.toLocaleString() : '---'}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Search Providers</span>
                  <span className="text-sm font-semibold text-green-600">
                    {stats ? `${stats.system.providers}/3 Active` : '---'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Azioni Rapide</h3>
            <div className="grid grid-cols-1 gap-3">
              <Link 
                href="/admin/settings" 
                className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-slate-900">Configura Sistema</h4>
                  <p className="text-sm text-slate-600">Provider e impostazioni</p>
                </div>
              </Link>

              <Link 
                href="/admin/logs" 
                className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all group"
              >
                <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-100 transition-colors">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-slate-900">System Logs</h4>
                  <p className="text-sm text-slate-600">Monitoraggio eventi</p>
                </div>
              </Link>

              <Link 
                href="/admin/analytics" 
                className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
              >
                <div className="bg-purple-50 p-2 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-slate-900">Analytics</h4>
                  <p className="text-sm text-slate-600">Report dettagliati</p>
                </div>
              </Link>

              <Link 
                href="/admin/users" 
                className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all group"
              >
                <div className="bg-orange-50 p-2 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-slate-900">Gestione Utenti</h4>
                  <p className="text-sm text-slate-600">Amministra accounts</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Attività Recente</h3>
              <Link 
                href="/admin/logs" 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Vedi tutto
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Nuovo utente registrato</p>
                    <span className="text-xs text-slate-500">2 min fa</span>
                  </div>
                  <p className="text-sm text-slate-600">user@example.com si è registrato con piano Free</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Ricerca completata</p>
                    <span className="text-xs text-slate-500">5 min fa</span>
                  </div>
                  <p className="text-sm text-slate-600">Trovati 3 risultati in 850ms</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Upgrade abbonamento</p>
                    <span className="text-xs text-slate-500">8 min fa</span>
                  </div>
                  <p className="text-sm text-slate-600">user2@example.com è passato al piano Pro</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Provider warning</p>
                    <span className="text-xs text-slate-500">15 min fa</span>
                  </div>
                  <p className="text-sm text-slate-600">Google Vision API rate limit avvicinato</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">Sistema aggiornato</p>
                    <span className="text-xs text-slate-500">1 ora fa</span>
                  </div>
                  <p className="text-sm text-slate-600">Deploy completato con successo v2.1.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}