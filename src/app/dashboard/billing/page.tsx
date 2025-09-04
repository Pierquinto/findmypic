'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client';
import DashboardLayout from '@/components/DashboardLayout'
import { 
  CreditCard, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Star,
  Zap,
  Shield,
  Download,
  RefreshCw,
  X,
  Check
} from 'lucide-react'

interface BillingInfo {
  currentPlan: string
  searches: number
  maxSearches: number
  subscription?: {
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    amount: number
    currency: string
  }
  invoices: any[]
}

const plans = [
  {
    name: 'Free',
    price: 0,
    currency: 'EUR',
    interval: 'mese',
    searches: 1,
    features: [
      'Ricerca base con 1 provider',
      'Risultati limitati',
      'Supporto email',
      'Crittografia dati standard'
    ],
    limitations: [
      'Solo 1 ricerca al mese',
      'Nessun URL diretto ai risultati',
      'Nessuna cronologia avanzata'
    ],
    popular: false,
    color: 'gray'
  },
  {
    name: 'Basic',
    price: 9.99,
    currency: 'EUR',
    interval: 'mese',
    searches: 10,
    features: [
      'Multi-provider search',
      'URL diretti ai risultati',
      'Cronologia completa',
      'Supporto prioritario',
      'Crittografia avanzata',
      'Export risultati'
    ],
    limitations: [
      'Limite 10 ricerche al mese'
    ],
    popular: true,
    color: 'blue'
  },
  {
    name: 'Pro',
    price: 29.99,
    currency: 'EUR',
    interval: 'mese',
    searches: 'Illimitate',
    features: [
      'Ricerche illimitate',
      'Content Guardian avanzato',
      'Monitoraggio automatico',
      'Alert in tempo reale',
      'API access',
      'Rimozione dati personalizzata',
      'Supporto telefonico',
      'Report dettagliati'
    ],
    limitations: [],
    popular: false,
    color: 'purple'
  }
]

export default function BillingPage() {
  const { user, loading: authLoading  } = useAuth()
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingInfo()
  }, [])

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch('/api/user/billing')
      if (response.ok) {
        const data = await response.json()
        setBillingInfo(data)
      }
    } catch (error) {
      console.error('Error fetching billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (planName: string) => {
    setChangingPlan(planName)
    
    try {
      const response = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName.toLowerCase() })
      })

      if (response.ok) {
        await fetchBillingInfo()
        // Show success message
      } else {
        // Show error message
        console.error('Failed to change plan')
      }
    } catch (error) {
      console.error('Error changing plan:', error)
    } finally {
      setChangingPlan(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Sei sicuro di voler annullare il tuo abbonamento? Continuerà fino alla fine del periodo corrente.')) {
      return
    }

    try {
      const response = await fetch('/api/user/subscription', {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchBillingInfo()
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
    }
  }

  const getUsagePercentage = () => {
    if (!billingInfo) return 0
    if (billingInfo.maxSearches === 0) return 100
    return Math.min((billingInfo.searches / billingInfo.maxSearches) * 100, 100)
  }

  const getPlanColor = (planName: string) => {
    const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase())
    return plan?.color || 'gray'
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Billing" description="Gestisci il tuo piano e fatturazione">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento informazioni billing...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Billing & Abbonamenti" description="Gestisci il tuo piano e visualizza la fatturazione">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Current Plan & Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CreditCard className="h-6 w-6 mr-2 text-purple-600" />
              Piano Attuale
            </h2>
            {billingInfo?.subscription?.cancelAtPeriodEnd && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Termina il {billingInfo.subscription.currentPeriodEnd ? new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString('it-IT') : 'N/A'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-3 bg-${getPlanColor(billingInfo?.currentPlan || 'free')}-100 rounded-full flex items-center justify-center`}>
                {billingInfo?.currentPlan === 'pro' ? (
                  <Zap className={`h-8 w-8 text-${getPlanColor(billingInfo?.currentPlan || 'free')}-600`} />
                ) : billingInfo?.currentPlan === 'basic' ? (
                  <Star className={`h-8 w-8 text-${getPlanColor(billingInfo?.currentPlan || 'free')}-600`} />
                ) : (
                  <Shield className={`h-8 w-8 text-${getPlanColor(billingInfo?.currentPlan || 'free')}-600`} />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 capitalize">
                Piano {billingInfo?.currentPlan || 'Free'}
              </h3>
              <p className="text-sm text-gray-500">
                {billingInfo?.subscription?.amount ? 
                  `€${(billingInfo.subscription.amount / 100).toFixed(2)}/mese` : 
                  'Gratuito'
                }
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-2xl font-bold text-blue-600">
                  {billingInfo?.searches || 0}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">Ricerche Utilizzate</h3>
              <p className="text-sm text-gray-500">
                su {billingInfo?.maxSearches === 999 ? 'illimitate' : billingInfo?.maxSearches || 0}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Prossimo Rinnovo</h3>
              <p className="text-sm text-gray-500">
                {billingInfo?.subscription?.currentPeriodEnd ? 
                  new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString('it-IT') : 
                  'N/A'
                }
              </p>
            </div>
          </div>

          {/* Usage Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Utilizzo Mensile</span>
              <span className="text-sm text-gray-500">{getUsagePercentage().toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  getUsagePercentage() >= 90 ? 'bg-red-600' : 
                  getUsagePercentage() >= 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${getUsagePercentage()}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {billingInfo?.subscription?.cancelAtPeriodEnd ? (
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riattiva Abbonamento
              </button>
            ) : billingInfo?.currentPlan !== 'free' && (
              <button 
                onClick={handleCancelSubscription}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Annulla Abbonamento
              </button>
            )}
          </div>
        </div>

        {/* Available Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Cambia Piano
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = plan.name.toLowerCase() === billingInfo?.currentPlan?.toLowerCase()
              
              return (
                <div 
                  key={plan.name}
                  className={`relative rounded-xl border-2 p-6 ${
                    plan.popular 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : isCurrentPlan
                      ? 'border-green-500 ring-2 ring-green-200'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 text-sm font-semibold rounded-full">
                      Consigliato
                    </span>
                  )}
                  
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 text-sm font-semibold rounded-full">
                      Piano Attuale
                    </span>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-gray-900">
                      €{plan.price}
                      <span className="text-lg font-normal text-gray-600">/{plan.interval}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {typeof plan.searches === 'string' ? plan.searches : `${plan.searches} ricerche`} al mese
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                    
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <X className="h-4 w-4 text-red-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-500">{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanChange(plan.name)}
                    disabled={isCurrentPlan || changingPlan === plan.name}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${changingPlan === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {changingPlan === plan.name ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cambiando...
                      </div>
                    ) : isCurrentPlan ? (
                      'Piano Attuale'
                    ) : plan.price === 0 ? (
                      'Passa a Free'
                    ) : (
                      `Passa a ${plan.name}`
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-purple-600" />
              Cronologia Fatturazione
            </h2>
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </button>
          </div>
          
          {billingInfo?.invoices?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Data</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Descrizione</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Stato</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Importo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {billingInfo.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(invoice.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{invoice.description}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status === 'paid' ? 'Pagata' : 
                           invoice.status === 'pending' ? 'In attesa' : 'Fallita'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        €{(invoice.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                          Scarica
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Nessuna fattura disponibile</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}