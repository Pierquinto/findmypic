'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/lib/auth/client';
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchResults from '@/components/SearchResults'
import ThumbnailImage from '@/components/OptimizedImage'
import Breadcrumb from '@/components/Breadcrumb'
import AnonymousResultsPaywall from '@/components/AnonymousResultsPaywall'
import { Shield, Upload, Search, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import PaywallModal from '@/components/PaywallModal'

type SearchResult = {
  id: string
  url: string
  siteName: string
  similarity: number
  status: 'violation' | 'partial' | 'clean'
  thumbnail?: string
  provider?: string
  webPageUrl?: string
}


export default function SearchPage() {
  const { user, loading, apiRequest } = useAuth()
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchId, setSearchId] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallData, setPaywallData] = useState<{
    plan: 'free' | 'basic' | 'pro'
    searches: number
    maxSearches: number
    trigger: 'limit_reached' | 'limit_approaching' | 'feature_locked'
  } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [searchHistory, setSearchHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showAnonymousPaywall, setShowAnonymousPaywall] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setScanComplete(false)
      setResults([])
      setSearchId(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  })

  const handleScan = async () => {
    if (!uploadedFile) return

    // Se non è loggato, esegui ricerca anonima
    if (!user) {
      setIsScanning(true)
      
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const imageData = e.target?.result
          
          const response = await apiRequest('/api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData,
              searchType: 'general_search',
              securityLevel: 'standard',
              anonymous: true // Flag per ricerca anonima
            }),
          })

          const data = await response.json()

          if (response.ok) {
            setResults(data.results)
            setSearchId(data.searchId)
            // Per utenti anonimi, mostra sempre il paywall dopo la ricerca
            setShowAnonymousPaywall(true)
          } else {
            alert(data.error || 'Errore durante la ricerca')
            setResults([])
            setSearchId(null)
          }
          
          setIsScanning(false)
          setScanComplete(true)
        }
        
        reader.readAsDataURL(uploadedFile)
      } catch (error) {
        console.error('Error:', error)
        alert('Errore durante la ricerca')
        setIsScanning(false)
      }
      return
    }

    setIsScanning(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result
        
        const response = await apiRequest('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData,
            searchType: 'general_search', // Può essere configurato dinamicamente
            securityLevel: 'standard'
          }),
        })

        const data = await response.json()

        if (response.status === 429) {
          setPaywallData({
            plan: data.plan,
            searches: data.searches,
            maxSearches: data.maxSearches,
            trigger: 'limit_reached'
          })
          setShowPaywall(true)
          setIsScanning(false)
          return
        }

        if (response.ok) {
          setResults(data.results)
          setSearchId(data.searchId)
        } else {
          alert(data.error || 'Errore durante la ricerca')
          setResults([])
          setSearchId(null)
        }
        
        setIsScanning(false)
        setScanComplete(true)
      }
      
      reader.readAsDataURL(uploadedFile)
    } catch (error) {
      console.error('Error:', error)
      alert('Errore durante la ricerca')
      setIsScanning(false)
    }
  }

  // Check for history search to load
  useEffect(() => {
    const loadHistorySearch = () => {
      try {
        const historyData = sessionStorage.getItem('loadHistorySearch')
        if (historyData) {
          const data = JSON.parse(historyData)
          setResults(data.results || [])
          setScanComplete(true)
          if (data.imageUrl) {
            setPreviewUrl(data.imageUrl)
          }
          // Clear the session storage
          sessionStorage.removeItem('loadHistorySearch')
        }
      } catch (error) {
        console.error('Error loading history search:', error)
      }
    }

    loadHistorySearch()
  }, [])

  // Check for approaching limit when component mounts
  useEffect(() => {
    const checkSearchLimits = async () => {
      if (user) {
        try {
          const response = await apiRequest('/api/user/limits')
          if (response.ok) {
            const data = await response.json()
            const remainingSearches = data.maxSearches - data.searches
            
            // Show warning when user has 1 search left (but more than 0)
            if (remainingSearches === 1 && data.maxSearches > 1) {
              setPaywallData({
                plan: data.plan,
                searches: data.searches,
                maxSearches: data.maxSearches,
                trigger: 'limit_approaching'
              })
              // Show paywall after a delay to not immediately interrupt user
              setTimeout(() => setShowPaywall(true), 2000)
            }
          }
        } catch (error) {
          console.error('Error checking limits:', error)
        }
      }
    }

    checkSearchLimits()
  }, [user])

  const loadSearchHistory = async () => {
    if (!user) return
    
    setLoadingHistory(true)
    try {
      const response = await apiRequest('/api/user/search-history?limit=10')
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data.searches)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadHistorySearch = (searchId: string) => {
    // Navigate directly to the search result page with UUID
    router.push(`/search/${searchId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        {/* Show uploaded image prominently when scanning or results are available */}
        {(previewUrl && (isScanning || scanComplete)) && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Immagine Analizzata</h2>
              <div className="flex justify-center">
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Immagine originale"
                    className="max-h-64 rounded-lg shadow-sm"
                  />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Originale
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area - Hidden when scanning or results shown */}
        {!isScanning && !scanComplete && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Verifica la tua Immagine
              </h1>
              <p className="text-xl text-gray-600">
                Carica un&apos;immagine per scoprire se è stata pubblicata online senza il tuo consenso
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-lg text-purple-600">Rilascia l&apos;immagine qui...</p>
                ) : (
                  <div>
                    <p className="text-lg text-gray-600 mb-2">
                      Trascina un&apos;immagine qui, o clicca per selezionare
                    </p>
                    <p className="text-sm text-gray-500">
                      Supporta JPG, PNG, GIF, WebP (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {previewUrl && (
                <div className="mt-6 flex items-center justify-center">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-xs max-h-64 rounded-lg shadow-sm"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                      Caricata
                    </div>
                  </div>
                </div>
              )}

              {uploadedFile && !isScanning && !scanComplete && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleScan}
                    className="inline-flex items-center bg-purple-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Inizia Scansione
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    {!user && "Prova gratis senza registrazione"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-8">


          {/* Scanning Progress */}
          {isScanning && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-purple-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Scansione in corso...
              </h3>
              <p className="text-gray-600 mb-4">
                Stiamo analizzando migliaia di siti web per trovare corrispondenze
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          )}

          {/* Results - Mostra paywall per utenti anonimi, risultati normali per utenti autenticati */}
          {scanComplete && (
            <>
              {!user && showAnonymousPaywall ? (
                <AnonymousResultsPaywall
                  resultsCount={results.length}
                  hasViolations={results.length > 0}
                  searchId={searchId || ''}
                  onRegister={() => router.push('/register')}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8">
                  <div className="flex items-center mb-6">
                    {results.length > 0 ? (
                      <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900">
                      Risultati della Scansione
                    </h3>
                  </div>

                  {results.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Nessuna violazione trovata!
                      </h4>
                      <p className="text-gray-600">
                        La tua immagine non è stata trovata sui siti web scansionati.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <SearchResults 
                        results={results.map(result => ({
                          id: result.id,
                          url: result.url,
                          siteName: result.siteName,
                          title: result.siteName,
                          similarity: result.similarity,
                          status: result.status,
                          thumbnail: result.thumbnail,
                          provider: result.provider,
                          webPageUrl: result.webPageUrl
                        }))}
                        userPlan={user ? (user as any)?.plan || 'free' : 'anonymous'}
                        searchId={searchId || undefined}
                      />

                      {user && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">
                            Cosa puoi fare ora:
                          </h4>
                          <ul className="text-blue-800 text-sm space-y-1">
                            <li>• Contatta i siti web per richiedere la rimozione</li>
                            <li>• Documenta le violazioni per azioni legali</li>
                            <li>• Monitora regolarmente con FindMyPic Pro</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Protection Disclaimer */}
                  <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-gray-600" />
                      Protezione dei Tuoi Dati
                    </h4>
                    <div className="text-xs text-gray-700 space-y-2">
                      <p>
                        <strong>Ricerca:</strong> Utilizziamo ricerca inversa automatica su provider terzi specializzati 
                        e monitoriamo siti noti per leak e contenuti non consensuali.
                      </p>
                      <p>
                        <strong>Privacy:</strong> Tutti i dati di ricerca vengono crittografati nel nostro database 
                        con cifratura AES-256.
                      </p>
                      <p>
                        <strong>Ritenzione:</strong> {user ? 
                          (user as any)?.plan === 'free' ? 
                            'I tuoi dati verranno rimossi automaticamente dopo 6 mesi.' :
                            'Puoi richiedere la rimozione dei tuoi dati in qualsiasi momento dalla dashboard.'
                          : 'I dati vengono rimossi automaticamente dopo 6 mesi per utenti free.'
                        }
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <Link 
                          href="/privacy" 
                          className="text-purple-600 hover:text-purple-700 text-xs underline"
                        >
                          Leggi la Privacy Policy
                        </Link>
                        {user && (user as any)?.plan !== 'free' && (
                          <Link 
                            href="/dashboard/privacy" 
                            className="text-purple-600 hover:text-purple-700 text-xs underline"
                          >
                            Gestisci i tuoi dati
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-center space-x-4">
                    <button
                      onClick={() => {
                        setUploadedFile(null)
                        setPreviewUrl(null)
                        setScanComplete(false)
                        setResults([])
                        setSearchId(null)
                        setShowAnonymousPaywall(false)
                      }}
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold inline-flex items-center"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Nuova Scansione
                    </button>
                    
                    {user && (
                      <button
                        onClick={() => {
                          setShowHistory(true)
                          loadSearchHistory()
                        }}
                        className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold inline-flex items-center"
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        Cronologia
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Custom Search Banner - Solo dopo i risultati */}
          {scanComplete && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Hai bisogno di una ricerca più approfondita?
                  </h3>
                  <p className="text-purple-100 text-sm mb-4">
                    Richiedi un'analisi manuale personalizzata da parte dei nostri esperti. 
                    Perfetto per casi complessi o siti specifici che richiedono monitoraggio continuo.
                  </p>
                  <div className="flex items-center space-x-4">
                    <Link 
                      href="/custom-search"
                      className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Richiesta Personalizzata
                    </Link>
                    <span className="text-purple-200 text-xs bg-purple-500 bg-opacity-50 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  </div>
                </div>
                <div className="hidden md:block ml-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold">€29.99</div>
                    <div className="text-purple-200 text-sm">da</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Paywall Modal */}
      {showPaywall && paywallData && (
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          userPlan={paywallData.plan}
          searchesUsed={paywallData.searches}
          maxSearches={paywallData.maxSearches}
          trigger={paywallData.trigger}
        />
      )}

      {/* Toast Notification */}
      {copiedUrl && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Link copiato negli appunti!
          </div>
        </div>
      )}

      {/* Search History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Clock className="h-6 w-6 mr-2 text-purple-600" />
                  Cronologia Ricerche
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Rivedi le tue ricerche precedenti senza consumare crediti aggiuntivi
              </p>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-600">Caricamento cronologia...</p>
                </div>
              ) : searchHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Nessuna ricerca nella cronologia</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchHistory.map((search) => (
                    <div 
                      key={search.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                      onClick={() => loadHistorySearch(search.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500">
                          {new Date(search.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {search.resultsCount} risultati
                        </span>
                      </div>
                      
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        <ThumbnailImage 
                          src={search.imageUrl || ''} 
                          alt="Ricerca precedente"
                          className="w-full h-full"
                        />
                      </div>
                      
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {search.searchType === 'general_search' ? 'Ricerca Generale' : search.searchType}
                        </p>
                        <p className="text-gray-500">
                          {search.searchTime ? `${search.searchTime}ms` : 'N/A'} • 
                          {Object.keys(search.providersUsed || {}).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}