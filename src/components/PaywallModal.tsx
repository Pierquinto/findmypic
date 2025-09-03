'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link'
import { 
  X, 
  Lock, 
  Zap, 
  Crown, 
  CheckCircle, 
  TrendingUp, 
  Shield, 
  Clock,
  Star,
  ArrowRight,
  Users,
  Target
} from 'lucide-react'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  userPlan: 'free' | 'basic' | 'pro'
  searchesUsed: number
  maxSearches: number
  trigger: 'limit_reached' | 'limit_approaching' | 'feature_locked'
}

export default function PaywallModal({ 
  isOpen, 
  onClose, 
  userPlan, 
  searchesUsed, 
  maxSearches,
  trigger 
}: PaywallModalProps) {
  const { user, loading } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic')
  const [showSocialProof, setShowSocialProof] = useState(true)

  useEffect(() => {
    // Auto-select recommended plan based on usage pattern
    if (trigger === 'limit_reached' && userPlan === 'free') {
      setSelectedPlan('basic')
    } else if (trigger === 'limit_reached' && userPlan === 'basic') {
      setSelectedPlan('pro')
    }
  }, [trigger, userPlan])

  if (!isOpen) return null

  const getHeadlineByTrigger = () => {
    switch (trigger) {
      case 'limit_reached':
        return userPlan === 'free' 
          ? "Hai raggiunto il limite gratuito!"
          : "Limite mensile raggiunto!"
      case 'limit_approaching':
        return "Stai per raggiungere il limite"
      case 'feature_locked':
        return "Sblocca tutte le funzionalità"
      default:
        return "Continua a proteggere la tua privacy"
    }
  }

  const getSubheadlineByTrigger = () => {
    switch (trigger) {
      case 'limit_reached':
        return userPlan === 'free'
          ? "Hai usato la tua ricerca gratuita. Aggiorna per continuare a proteggere la tua privacy digitale."
          : `Hai usato tutte le ${maxSearches} ricerche del mese. Aggiorna per continuare senza limiti.`
      case 'limit_approaching':
        return `Hai usato ${searchesUsed}/${maxSearches} ricerche. Aggiorna ora per non perdere protezione.`
      case 'feature_locked':
        return "Accedi a scansioni illimitate, monitoraggio continuo e report dettagliati."
      default:
        return "Scegli il piano perfetto per le tue esigenze di privacy."
    }
  }

  const getUrgencyMessage = () => {
    if (trigger === 'limit_reached') {
      return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800 font-medium">
              La tua immagine è ancora a rischio. Aggiorna ora per continuare a monitorare.
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const getSocialProof = () => {
    const stats = [
      { icon: Users, value: "10,000+", label: "utenti protetti" },
      { icon: Shield, value: "99.8%", label: "accuratezza" },
      { icon: Target, value: "24/7", label: "monitoraggio" }
    ]

    return (
      <div className="flex justify-center space-x-8 py-6 border-y border-gray-100">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
              <stat.icon className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>
    )
  }

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '9.99',
      period: '/mese',
      icon: Zap,
      badge: userPlan === 'free' ? 'Consigliato' : null,
      badgeColor: 'bg-green-100 text-green-800',
      features: [
        '10 ricerche al mese',
        'Scansione avanzata',
        'Report dettagliati',
        'Cronologia ricerche',
        'Notifiche email',
        'Supporto prioritario'
      ],
      savings: userPlan === 'free' ? 'Rispetto al costo per singola ricerca' : null,
      cta: userPlan === 'free' ? 'Inizia con Basic' : 'Mantieni Basic'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '19.99',
      period: '/mese',
      icon: Crown,
      badge: userPlan === 'basic' ? 'Upgrade' : 'Massima protezione',
      badgeColor: 'bg-purple-100 text-purple-800',
      features: [
        'Ricerche illimitate',
        'Monitoraggio continuo',
        'Alert in tempo reale',
        'API access',
        'Report personalizzati',
        'Assistenza dedicata'
      ],
      savings: 'Risparmia 40% vs ricerche singole',
      cta: 'Passa a Pro'
    }
  ]

  const handlePlanSelect = (planId: 'basic' | 'pro') => {
    setSelectedPlan(planId)
    // Track conversion intent
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'EUR',
        value: planId === 'basic' ? 9.99 : 19.99,
        items: [{
          item_id: planId,
          item_name: `FindMyPic ${planId}`,
          category: 'subscription',
          quantity: 1,
          price: planId === 'basic' ? 9.99 : 19.99
        }]
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2">{getHeadlineByTrigger()}</h2>
            <p className="text-purple-100 text-lg max-w-2xl mx-auto">
              {getSubheadlineByTrigger()}
            </p>
          </div>
        </div>

        <div className="p-6">
          {getUrgencyMessage()}

          {showSocialProof && getSocialProof()}

          {/* Usage Progress (if relevant) */}
          {trigger !== 'feature_locked' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Ricerche utilizzate</span>
                <span className="text-sm text-gray-500">{searchesUsed} / {maxSearches}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    searchesUsed >= maxSearches ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.min((searchesUsed / maxSearches) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Plans */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
                onClick={() => handlePlanSelect(plan.id as 'basic' | 'pro')}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                    <plan.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-gray-900">
                    €{plan.price}
                    <span className="text-lg font-normal text-gray-500">{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <p className="text-sm text-green-600 font-medium mt-1">{plan.savings}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className={`w-4 h-4 rounded-full border-2 absolute top-6 right-6 ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300'
                }`}>
                  {selectedPlan === plan.id && (
                    <CheckCircle className="h-4 w-4 text-white -m-0.5" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-4">
            <Link
              href={`/pricing?plan=${selectedPlan}&upgrade=true`}
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {plans.find(p => p.id === selectedPlan)?.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                Sicurezza garantita
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                Cancella quando vuoi
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                30 giorni soddisfatto o rimborsato
              </div>
            </div>

            {trigger === 'limit_reached' && (
              <p className="text-xs text-gray-400 mt-4">
                Continuando, accetti i nostri <Link href="/terms" className="underline">Termini di Servizio</Link> e la <Link href="/privacy" className="underline">Privacy Policy</Link>
              </p>
            )}
          </div>

          {/* Testimonial */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold">
                  M
                </div>
              </div>
              <div>
                <p className="text-gray-700 italic mb-2">
                  "FindMyPic mi ha salvato da una situazione imbarazzante. Ho scoperto che le mie foto erano state pubblicate su 3 siti senza permesso. Ora uso il monitoraggio continuo per stare tranquilla."
                </p>
                <div className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">Marco T.</span>
                  <span className="text-sm text-gray-500 ml-2">Cliente FindMyPic Pro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}