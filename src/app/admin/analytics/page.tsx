'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  BarChart3,
  TrendingUp,
  Users,
  Search,
  DollarSign,
  Download,
  RefreshCw,
  Eye,
  Target,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  users: {
    total: number
    growth: number[]
    newUsers: number[]
    activeUsers: number[]
    churnRate: number[]
  }
  searches: {
    total: number
    daily: number[]
    byProvider: Array<{ provider: string; count: number; percentage: number }>
    successRate: number[]
    avgResponseTime: number[]
  }
  revenue: {
    total: number
    monthly: number[]
    byPlan: Array<{ plan: string; revenue: number; percentage: number }>
    arpu: number[]
    ltv: number
  }
  system: {
    uptime: number[]
    errors: number[]
    performance: number[]
  }
}

export default function AnalyticsDashboard() {
  const { user, userProfile, loading: authLoading, apiRequest  } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchAnalytics()
  }, [user, authLoading, router, timeRange])

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      const response = await apiRequest(`/api/admin/analytics?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?timeRange=${timeRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-report-${timeRange}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  if (!authLoading && user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Time Range and Actions */}
        <div className="flex justify-between items-center">
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d">Ultimi 30 giorni</option>
            <option value="90d">Ultimi 3 mesi</option>
            <option value="365d">Ultimo anno</option>
          </select>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
            <button
              onClick={exportReport}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </button>
          </div>
        </div>
        {/* Key Metrics */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Utenti Totali</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.users.total.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">
                    +{((analytics.users.growth[analytics.users.growth.length - 1] || 0) * 100).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs periodo precedente</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ricerche Totali</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.searches.total.toLocaleString()}</p>
                  </div>
                  <Search className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <Activity className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-blue-600 font-medium">
                    {analytics.searches.successRate[analytics.searches.successRate.length - 1]?.toFixed(1) || 0}%
                  </span>
                  <span className="text-gray-500 ml-1">success rate</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fatturato Totale</p>
                    <p className="text-3xl font-bold text-gray-900">€{analytics.revenue.total.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <Target className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-purple-600 font-medium">€{analytics.revenue.ltv}</span>
                  <span className="text-gray-500 ml-1">LTV medio</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Uptime Sistema</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {((analytics.system.uptime[analytics.system.uptime.length - 1] || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-gray-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <Eye className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-gray-600 font-medium">
                    {analytics.system.errors[analytics.system.errors.length - 1] || 0} errori
                  </span>
                  <span className="text-gray-500 ml-1">nelle ultime 24h</span>
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Growth Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Crescita Utenti</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Grafico crescita utenti</p>
                    <p className="text-sm text-gray-400">
                      Nuovi: {analytics.users.newUsers.reduce((a, b) => a + b, 0)} | 
                      Attivi: {analytics.users.activeUsers.reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Andamento Fatturato</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Grafico fatturato mensile</p>
                    <p className="text-sm text-gray-400">
                      ARPU medio: €{analytics.revenue.arpu[analytics.revenue.arpu.length - 1]?.toFixed(2) || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Provider Performance */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Provider</h3>
                <div className="space-y-4">
                  {analytics.searches.byProvider.map((provider, index) => (
                    <div key={provider.provider} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          index === 0 ? 'bg-purple-500' :
                          index === 1 ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900">{provider.provider}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{provider.count.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{provider.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuzione Piani</h3>
                <div className="space-y-4">
                  {analytics.revenue.byPlan.map((plan, index) => (
                    <div key={plan.plan} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          plan.plan === 'pro' ? 'bg-purple-500' :
                          plan.plan === 'basic' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">{plan.plan}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">€{plan.revenue}</div>
                        <div className="text-xs text-gray-500">{plan.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Performance */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Sistema</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tempo Risposta Medio</span>
                    <span className="text-sm font-medium">
                      {analytics.searches.avgResponseTime[analytics.searches.avgResponseTime.length - 1]?.toFixed(0) || 0}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-medium text-green-600">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Errori/Ora</span>
                    <span className="text-sm font-medium">
                      {(analytics.system.errors.reduce((a, b) => a + b, 0) / 24).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Load Average</span>
                    <span className="text-sm font-medium">
                      {(analytics.system.performance[analytics.system.performance.length - 1] || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attività Recente</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">{new Date().toLocaleTimeString('it-IT')}</span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-900">Sistema aggiornato con successo</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">{new Date(Date.now() - 300000).toLocaleTimeString('it-IT')}</span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-900">Completate {analytics.searches.daily[analytics.searches.daily.length - 1] || 0} ricerche</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">{new Date(Date.now() - 600000).toLocaleTimeString('it-IT')}</span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-900">Report analytics generato</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}