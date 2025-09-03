'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import SearchResults, { SearchResultItem } from '@/components/SearchResults'
import ThumbnailImage from '@/components/OptimizedImage'
import { AlertTriangle, CheckCircle } from 'lucide-react'

// Use the shared SearchResultItem type

interface SearchData {
  searchId: string
  imageUrl: string
  searchType: string
  resultsCount: number
  searchTime: number
  createdAt: string
  results: SearchResultItem[]
  metadata?: any
}

export default function SearchResultPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading: authLoading  } = useAuth()
  const [searchData, setSearchData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadSearchData(id as string)
    }
  }, [id])

  const loadSearchData = async (searchId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/search-history/${searchId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Search data loaded:', data) // Debug log
        console.log('Results array:', data.results, 'Length:', data.results?.length) // Debug log
        setSearchData(data)
      } else if (response.status === 404) {
        setError('Ricerca non trovata')
      } else {
        setError('Errore nel caricamento della ricerca')
      }
    } catch (error) {
      console.error('Error loading search:', error)
      setError('Errore nel caricamento della ricerca')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento ricerca...</p>
        </div>
      </div>
    )
  }

  if (error || !searchData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{error}</h1>
          <Link 
            href="/dashboard/history" 
            className="text-purple-600 hover:text-purple-700"
          >
            Torna alla cronologia
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        {/* Header della ricerca */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ThumbnailImage
                src={searchData.imageUrl}
                alt="Immagine ricercata"
                className="w-20 h-20 rounded-lg shadow-sm"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Risultati Ricerca
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Data:</span> {formatDate(searchData.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Risultati:</span> {searchData.resultsCount}
                </div>
                <div>
                  <span className="font-medium">Tempo:</span> {searchData.searchTime}ms
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {searchData.searchType === 'general_search' ? 'Ricerca Generale' : searchData.searchType}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risultati */}
        <SearchResults 
          results={searchData.results} 
          userPlan={(user as any)?.plan || 'free'} 
          searchId={searchData.searchId}
        />
      </main>
    </div>
  )
}