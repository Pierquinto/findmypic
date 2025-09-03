'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Search
} from 'lucide-react'

interface Subscription {
  id: string
  plan: string
  status: string
  amount: number
  currency: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: string
  user: {
    id: string
    email: string
  }
}

export default function SubscriptionsManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !(session.user as any).isAdmin) {
      router.push('/login')
      return
    }

    fetchSubscriptions()
    fetchSubscriptionStats()
  }, [session, status, router])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions)
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const fetchSubscriptionStats = async () => {
    try {
      const response = await fetch('/api/admin/subscription-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching subscription stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        fetchSubscriptions()
        fetchSubscriptionStats()
      }
    } catch (error) {
      console.error('Error performing subscription action:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      canceled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      past_due: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      incomplete: { color: 'bg-gray-100 text-gray-800', icon: Clock }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </span>
    )
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {plan.toUpperCase()}
      </span>
    )
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
    const matchesPlan = planFilter === 'all' || sub.plan === planFilter
    return matchesStatus && matchesPlan
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">MRR (Monthly Recurring Revenue)</p>
                <p className="text-2xl font-bold text-gray-900">€{stats.mrr?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Abbonamenti Attivi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Crescita Mensile</p>
                <p className="text-2xl font-bold text-gray-900">{stats.monthlyGrowth || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.churnRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Andamento Fatturato</h2>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Esporta Report
            </button>
          </div>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Grafico fatturato mensile (da implementare con Chart.js)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">Attivi</option>
                <option value="canceled">Cancellati</option>
                <option value="past_due">Scaduti</option>
                <option value="incomplete">Incompleti</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Piano</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">Tutti i piani</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                <Filter className="h-4 w-4 inline mr-2" />
                Applica Filtri
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Piano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periodo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.user.email}</div>
                      <div className="text-sm text-gray-500">ID: {subscription.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanBadge(subscription.plan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{(subscription.amount / 100).toFixed(2)}/{subscription.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(subscription.currentPeriodStart).toLocaleDateString('it-IT')} - {new Date(subscription.currentPeriodEnd).toLocaleDateString('it-IT')}
                      </div>
                      {subscription.cancelAtPeriodEnd && (
                        <div className="text-xs text-red-600 mt-1">
                          Cancellazione programmata
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSubscriptionAction(subscription.id, 'view_details')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Dettagli
                        </button>
                        {subscription.status === 'active' ? (
                          <button
                            onClick={() => handleSubscriptionAction(subscription.id, 'cancel')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancella
                          </button>
                        ) : subscription.status === 'canceled' && !subscription.cancelAtPeriodEnd ? (
                          <button
                            onClick={() => handleSubscriptionAction(subscription.id, 'reactivate')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Riattiva
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}