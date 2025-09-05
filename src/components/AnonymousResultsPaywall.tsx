'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  Lock, 
  Eye, 
  Mail, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Star,
  Clock
} from 'lucide-react'

interface AnonymousResultsPaywallProps {
  resultsCount: number
  hasViolations: boolean
  searchId: string
  onRegister: () => void
}

export default function AnonymousResultsPaywall({ 
  resultsCount, 
  hasViolations, 
  searchId,
  onRegister 
}: AnonymousResultsPaywallProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [showQuickSignup, setShowQuickSignup] = useState(false)

  const handleQuickSignup = () => {
    if (email) {
      // Save search data for after registration
      sessionStorage.setItem('pendingSearchAccess', JSON.stringify({
        searchId,
        resultsCount,
        hasViolations,
        timestamp: Date.now()
      }))
      
      // Navigate to register with email pre-filled
      router.push(`/register?email=${encodeURIComponent(email)}&searchId=${searchId}`)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Results Preview */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          {hasViolations ? (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          ) : (
            <CheckCircle className="h-8 w-8 text-green-500" />
          )}
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Scansione Completata! 
        </h3>
        
        {hasViolations ? (
          <div className="text-center">
            <p className="text-lg text-red-600 font-semibold mb-2">
              ⚠️ {resultsCount} possibili violazioni trovate
            </p>
            <p className="text-gray-600">
              Abbiamo trovato la tua immagine su {resultsCount} siti web. 
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg text-green-600 font-semibold mb-2">
              ✅ Nessuna violazione rilevata
            </p>
            <p className="text-gray-600">
              La tua immagine sembra essere sicura sui siti che abbiamo scansionato.
            </p>
          </div>
        )}
      </div>

      {/* Blurred Results Preview */}
      <div className="relative mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
          <div className="text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Risultati Dettagliati Disponibili
            </h4>
            <div className="space-y-2 text-sm text-gray-600 max-w-md mx-auto">
              {hasViolations ? (
                <>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-gray-300 rounded blur-sm"></div>
                    <span className="blur-sm">████████████.com</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-gray-300 rounded blur-sm"></div>
                    <span className="blur-sm">██████████.net</span>
                  </div>
                  {resultsCount > 2 && (
                    <div className="text-gray-500">
                      ... e altri {resultsCount - 2} risultati
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500">
                  Report dettagliato della scansione disponibile
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent rounded-lg pointer-events-none"></div>
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-8">
        <h4 className="text-lg font-semibold text-purple-900 mb-4 text-center">
          🔓 Cosa ottieni con la registrazione gratuita:
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Eye className="h-5 w-5 text-purple-600 mt-1" />
            <div>
              <p className="font-medium text-purple-900">Risultati completi</p>
              <p className="text-sm text-purple-700">Vedi tutti i dettagli e i link diretti</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-purple-600 mt-1" />
            <div>
              <p className="font-medium text-purple-900">3 ricerche gratuite</p>
              <p className="text-sm text-purple-700">Ogni mese, senza costi</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-purple-600 mt-1" />
            <div>
              <p className="font-medium text-purple-900">Cronologia ricerche</p>
              <p className="text-sm text-purple-700">Accesso alle ricerche passate</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-purple-600 mt-1" />
            <div>
              <p className="font-medium text-purple-900">Report via email</p>
              <p className="text-sm text-purple-700">Ricevi i risultati per email</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Signup Form */}
      {!showQuickSignup ? (
        <div className="text-center space-y-4">
          <button
            onClick={() => setShowQuickSignup(true)}
            className="w-full bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center"
          >
            <Mail className="mr-2 h-5 w-5" />
            Registrati Gratis per Vedere i Risultati
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <Link 
              href={`/login?searchId=${searchId}`}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              Ho già un account
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h5 className="font-semibold text-gray-900 mb-2">
              Registrazione rapida
            </h5>
            <p className="text-sm text-gray-600">
              Inserisci la tua email per accedere immediatamente ai risultati
            </p>
          </div>
          
          <div className="space-y-3">
            <input
              type="email"
              placeholder="La tua email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuickSignup()
                }
              }}
            />
            
            <button
              onClick={handleQuickSignup}
              disabled={!email}
              className="w-full bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Crea Account e Vedi Risultati
            </button>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setShowQuickSignup(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Indietro
            </button>
            
            <Link 
              href={`/login?searchId=${searchId}`}
              className="text-purple-600 hover:text-purple-700"
            >
              Ho già un account
            </Link>
          </div>
        </div>
      )}

      {/* Trust Indicators */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4" />
            <span>100% Gratuito</span>
          </div>
          <div className="flex items-center space-x-1">
            <Mail className="h-4 w-4" />
            <span>No Spam</span>
          </div>
          <div className="flex items-center space-x-1">
            <Lock className="h-4 w-4" />
            <span>Dati Sicuri</span>
          </div>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            Registrandoti accetti i nostri{' '}
            <Link href="/terms" className="text-purple-600 hover:underline">Termini di Servizio</Link>
            {' '}e la{' '}
            <Link href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}