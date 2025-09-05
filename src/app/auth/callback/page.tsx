'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CheckCircle, AlertTriangle, ArrowRight, Eye } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [pendingSearchData, setPendingSearchData] = useState<any>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient()
        
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError(error.message)
          setStatus('error')
          return
        }

        if (data.session) {
          console.log('Authentication successful')
          
          // Check for pending search data
          const pendingData = sessionStorage.getItem('pendingSearchAccess')
          if (pendingData) {
            try {
              const searchData = JSON.parse(pendingData)
              setPendingSearchData(searchData)
              // Keep the data for now, we'll clear it when user accesses the results
            } catch (error) {
              console.error('Error parsing pending search data:', error)
            }
          }
          
          setStatus('success')
        } else {
          setError('Nessuna sessione trovata. Riprova ad accedere.')
          setStatus('error')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        setError('Errore durante la verifica dell\'account')
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [])

  const handleViewResults = () => {
    if (pendingSearchData) {
      // Clear the pending data and redirect to search results
      sessionStorage.removeItem('pendingSearchAccess')
      router.push(`/search/${pendingSearchData.searchId}`)
    }
  }

  const handleGoToDashboard = () => {
    // Clear any pending data when going to dashboard
    sessionStorage.removeItem('pendingSearchAccess')
    router.push('/dashboard')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="max-w-md w-full text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
            <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verifica in corso...
          </h2>
          <p className="text-gray-600">
            Stiamo confermando il tuo account
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="max-w-md w-full text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Errore di Verifica
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Si è verificato un errore durante la verifica dell\'account'}
          </p>
          
          <div className="space-y-3">
            <Link
              href="/register"
              className="block w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Riprova Registrazione
            </Link>
            <Link
              href="/login"
              className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Torna al Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="max-w-lg w-full text-center p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Account Confermato!
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          Il tuo account è stato attivato con successo. Benvenuto su FindMyPic! 🎉
        </p>

        {pendingSearchData ? (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <Eye className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-purple-900">
                  I tuoi risultati sono pronti!
                </h3>
              </div>
              <p className="text-purple-800 mb-4">
                Hai <strong>{pendingSearchData.resultsCount}</strong>{' '}
                {pendingSearchData.hasViolations ? 'possibili violazioni' : 'risultati'} 
                da visualizzare dalla ricerca che hai effettuato prima della registrazione.
              </p>
              <button
                onClick={handleViewResults}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center"
              >
                <Eye className="mr-2 h-5 w-5" />
                Visualizza Risultati
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={handleGoToDashboard}
                className="text-gray-600 hover:text-gray-800 text-sm underline"
              >
                Oppure vai alla Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Cosa puoi fare ora:
              </h3>
              <ul className="text-blue-800 text-sm space-y-1 text-left">
                <li>• 3 ricerche gratuite ogni mese</li>
                <li>• Accesso completo ai risultati</li>
                <li>• Cronologia delle ricerche</li>
                <li>• Report via email</li>
              </ul>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center"
            >
              Vai alla Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>

            <div className="text-center">
              <Link
                href="/search"
                className="text-purple-600 hover:text-purple-700 text-sm underline"
              >
                Inizia una nuova ricerca
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Il tuo account è ora completamente attivo e puoi utilizzare tutte le funzionalità di FindMyPic.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="max-w-md w-full text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
            <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Caricamento...
          </h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}