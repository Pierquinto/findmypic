import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import { Shield, Check, Star, Zap, Crown, TrendingUp, Clock } from 'lucide-react'

export default function PricingPage() {
  const isUpgrade = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('upgrade') === 'true'
    : false
  const selectedPlan = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('plan') || 'basic'
    : 'basic'
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Breadcrumb />
        <div className="text-center mb-16">
          {isUpgrade && (
            <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Clock className="h-4 w-4 mr-2" />
              Limite ricerche raggiunto - Aggiorna ora per continuare
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {isUpgrade ? 'Continua a proteggere' : 'Scegli il piano perfetto'}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
              {isUpgrade ? ' la tua privacy' : ' per la tua privacy'}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isUpgrade 
              ? 'Hai raggiunto il limite del tuo piano. Aggiorna ora per sbloccare più ricerche e protezione avanzata.'
              : 'Proteggi la tua immagine digitale con piani flessibili adatti a ogni esigenza. Inizia gratis e aggiorna quando ne hai bisogno.'
            }
          </p>
        </div>

        {/* Urgency Banner for Upgrades */}
        {isUpgrade && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-6 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-red-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">La tua immagine è ancora a rischio</h3>
                  <p className="text-red-700">
                    Senza un piano attivo, non puoi monitorare se le tue immagini vengono pubblicate online senza consenso. 
                    <strong> Aggiorna ora per riprendere la protezione.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                <Shield className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratuito</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €0
                <span className="text-lg font-normal text-gray-500">/sempre</span>
              </div>
              <p className="text-gray-600">Perfetto per iniziare</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">1 ricerca gratuita</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Scansione di base</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Risultati istantanei</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Privacy garantita</span>
              </li>
            </ul>

            <Link 
              href="/register" 
              className="w-full bg-gray-100 text-gray-900 py-3 px-6 rounded-lg text-center font-semibold hover:bg-gray-200 transition-colors block"
            >
              Inizia Gratis
            </Link>
          </div>

          {/* Basic Plan - Most Popular */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 relative ${
            selectedPlan === 'basic' ? 'border-2 border-purple-600 transform scale-105 ring-4 ring-purple-200' : 'border-2 border-purple-600 transform scale-105'
          }`}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center">
                <Star className="h-4 w-4 mr-1" />
                Più Popolare
              </span>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €9.99
                <span className="text-lg font-normal text-gray-500">/mese</span>
              </div>
              <p className="text-gray-600">Per uso personale regolare</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">10 ricerche al mese</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Scansione avanzata</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Report dettagliati</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Cronologia ricerche</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Notifiche email</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Supporto prioritario</span>
              </li>
            </ul>

            <Link 
              href="/dashboard/billing" 
              className={`w-full text-center font-semibold py-3 px-6 rounded-lg transition-all block ${
                selectedPlan === 'basic' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg animate-pulse' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isUpgrade && selectedPlan === 'basic' ? '🚀 Aggiorna a Basic' : 'Scegli Basic'}
            </Link>
          </div>

          {/* Pro Plan */}
          <div className={`bg-white rounded-2xl shadow-sm p-8 relative ${
            selectedPlan === 'pro' ? 'border-2 border-indigo-600 transform scale-105 ring-4 ring-indigo-200' : 'border border-gray-200'
          }`}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
                <Crown className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €29.99
                <span className="text-lg font-normal text-gray-500">/mese</span>
              </div>
              <p className="text-gray-600">Massima protezione</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Ricerche illimitate</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Monitoraggio continuo</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Alert in tempo reale</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">API access</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Report personalizzati</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Assistenza dedicata</span>
              </li>
            </ul>

            <Link 
              href="/dashboard/billing" 
              className={`w-full text-center font-semibold py-3 px-6 rounded-lg transition-all block ${
                selectedPlan === 'pro' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg animate-pulse' 
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {isUpgrade && selectedPlan === 'pro' ? '🚀 Aggiorna a Pro' : 'Scegli Pro'}
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Domande Frequenti
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Come funziona la ricerca gratuita?
              </h3>
              <p className="text-gray-600">
                Ogni account gratuito include 1 ricerca completa. Puoi caricare un&apos;immagine 
                e ricevere un report dettagliato su eventuali violazioni trovate.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Quanto sono accurate le ricerche?
              </h3>
              <p className="text-gray-600">
                Le nostre ricerche utilizzano tecnologia AI avanzata con un&apos;accuratezza del 95%. 
                Scansioniamo migliaia di siti web e piattaforme.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Le mie immagini sono al sicuro?
              </h3>
              <p className="text-gray-600">
                Assolutamente sì. Le immagini sono crittografate end-to-end e cancellate 
                automaticamente dopo 24 ore. Non condividiamo mai i tuoi dati.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Posso cancellare l&apos;abbonamento in qualsiasi momento?
              </h3>
              <p className="text-gray-600">
                Sì, puoi cancellare l&apos;abbonamento in qualsiasi momento dalla dashboard. 
                Non ci sono penali o costi nascosti.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-8 mb-8">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-green-500 mr-2" />
              <span className="text-gray-700">Privacy Garantita</span>
            </div>
            <div className="flex items-center">
              <Check className="h-6 w-6 text-green-500 mr-2" />
              <span className="text-gray-700">Nessun Contratto</span>
            </div>
            <div className="flex items-center">
              <Zap className="h-6 w-6 text-green-500 mr-2" />
              <span className="text-gray-700">Risultati Istantanei</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Tutti i piani includono crittografia end-to-end e cancellazione automatica dei dati
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Shield className="h-6 w-6 text-purple-400 mr-2" />
            <span className="text-xl font-bold">FindMyPic</span>
          </div>
          <p className="text-center text-gray-400 mt-4">
            © 2024 FindMyPic. Proteggiamo la tua privacy digitale.
          </p>
        </div>
      </footer>
    </div>
  )
}