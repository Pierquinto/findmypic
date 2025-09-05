'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pendingSearchData, setPendingSearchData] = useState<any>(null)
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for pre-filled email and pending search data
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail))
    }

    // Check for pending search data
    const pendingData = sessionStorage.getItem('pendingSearchAccess')
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData)
        setPendingSearchData(data)
      } catch (error) {
        console.error('Error parsing pending search data:', error)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  // Show success message after registration
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="max-w-lg w-full space-y-8 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Controlla la tua email!
            </h2>
            
            <p className="text-lg text-gray-600 mb-6">
              Abbiamo inviato un link di conferma a <strong>{email}</strong>
            </p>
            
            {pendingSearchData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <div className="flex items-center mb-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-purple-900">
                    I tuoi risultati di ricerca ti aspettano!
                  </h3>
                </div>
                <p className="text-purple-800 text-sm mb-3">
                  Hai {pendingSearchData.resultsCount} {pendingSearchData.hasViolations ? 'possibili violazioni' : 'risultati'} pronti da visualizzare.
                </p>
                <p className="text-purple-700 text-sm">
                  Dopo aver confermato la tua email, potrai accedere immediatamente ai risultati completi della tua ricerca.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Importante:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Controlla anche la cartella spam/junk</li>
                    <li>• Il link è valido per 24 ore</li>
                    <li>• Clicca il link per attivare il tuo account</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Non hai ricevuto l'email?
              </p>
              <button
                onClick={() => setSuccess(false)} // Allow user to try again
                className="text-purple-600 hover:text-purple-700 text-sm font-semibold"
              >
                Riprova con un'altra email
              </button>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Torna al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <img
            className="mx-auto h-12 w-auto"
            src="/logo.svg"
            alt="FindMyPic"
          />
          
          {pendingSearchData ? (
            <div className="mt-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Quasi fatto!
              </h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-purple-800 text-sm">
                  📊 Hai <strong>{pendingSearchData.resultsCount}</strong> {pendingSearchData.hasViolations ? 'possibili violazioni' : 'risultati'} in attesa
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Crea il tuo account per vedere i risultati completi
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Crea il tuo account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                O{' '}
                <Link
                  href="/login"
                  className="font-medium text-purple-600 hover:text-purple-500"
                >
                  accedi al tuo account esistente
                </Link>
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Indirizzo email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Inserisci la tua email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Inserisci una password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Conferma password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Conferma la password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrazione in corso...
                </span>
              ) : pendingSearchData ? (
                'Crea Account e Vedi Risultati'
              ) : (
                'Registrati Gratis'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Registrandoti accetti i nostri{' '}
              <Link href="/terms" className="text-purple-600 hover:underline">
                Termini di Servizio
              </Link>{' '}
              e la{' '}
              <Link href="/privacy" className="text-purple-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}