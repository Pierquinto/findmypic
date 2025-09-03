'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import ThumbnailImage from '@/components/OptimizedImage'
import { 
  History, 
  Search, 
  Calendar,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2
} from 'lucide-react'

interface SearchHistoryItem {
  id: string
  imageUrl?: string
  searchType: string
  resultsCount: number
  searchTime: number
  createdAt: string
  providersUsed: any
  results?: any[]
  hasFullResults: boolean
  status: string
}

interface FilterState {
  dateRange: string
  searchType: string
  resultsFilter: string
  sortBy: string
}

export default function HistoryPage() {
  const { user, loading: authLoading  } = useAuth()
  const router = useRouter()
  const [searches, setSearches] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSearch, setSelectedSearch] = useState<SearchHistoryItem | null>(null)
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0, hasMore: false })
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    searchType: 'all',
    resultsFilter: 'all',
    sortBy: 'newest'
  })

  useEffect(() => {
    console.log('History page - session:', session)
    fetchSearchHistory()
  }, [filters, pagination.offset, session])

  const fetchSearchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== 'all') acc[key] = value
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/user/search-history?${params}`)
      if (response.ok) {
        const data = await response.json()
        
        if (pagination.offset === 0) {
          setSearches(data.searches)
        } else {
          setSearches(prev => [...prev, ...data.searches])
        }
        
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          hasMore: data.pagination.hasMore
        }))
      }
    } catch (error) {
      console.error('Error fetching search history:', error)
    } finally {
      setLoading(false)
    }
  }

  const openSearchInOriginalView = async (searchId: string) => {
    // Navigate directly to the search result page with UUID
    router.push(`/search/${searchId}`)
  }

  const deleteSearch = async (searchId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa ricerca dalla cronologia?')) return

    try {
      const response = await fetch('/api/user/search-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId })
      })

      if (response.ok) {
        setSearches(prev => prev.filter(s => s.id !== searchId))
        if (selectedSearch?.id === searchId) {
          setSelectedSearch(null)
        }
      }
    } catch (error) {
      console.error('Error deleting search:', error)
    }
  }

  const exportHistory = async () => {
    try {
      const response = await fetch('/api/user/export-history')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cronologia-ricerche-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting history:', error)
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, offset: 0 }))
  }

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
    }
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

  const getStatusIcon = (status: string, resultsCount: number) => {
    if (status === 'failed') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (resultsCount === 0) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = (status: string, resultsCount: number) => {
    if (status === 'failed') return 'Fallita'
    if (resultsCount === 0) return 'Nessuna violazione'
    return `${resultsCount} violazioni`
  }

  if (loading && searches.length === 0) {
    return (
      <DashboardLayout title="Cronologia Ricerche" description="Visualizza e gestisci le tue ricerche precedenti">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento cronologia...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Cronologia Ricerche" description="Visualizza e gestisci le tue ricerche precedenti">
      <div className="max-w-7xl mx-auto">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </button>
              
              <button
                onClick={exportHistory}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              {pagination.total} ricerche totali
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">Tutto</option>
                    <option value="today">Oggi</option>
                    <option value="week">Ultima settimana</option>
                    <option value="month">Ultimo mese</option>
                    <option value="quarter">Ultimi 3 mesi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Ricerca</label>
                  <select
                    value={filters.searchType}
                    onChange={(e) => handleFilterChange('searchType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">Tutti i tipi</option>
                    <option value="general_search">Ricerca generale</option>
                    <option value="copyright_detection">Rilevamento copyright</option>
                    <option value="adult_content">Contenuti adulti</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risultati</label>
                  <select
                    value={filters.resultsFilter}
                    onChange={(e) => handleFilterChange('resultsFilter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">Tutti</option>
                    <option value="violations">Solo violazioni</option>
                    <option value="clean">Solo pulite</option>
                    <option value="failed">Solo fallite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ordina per</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="newest">Più recenti</option>
                    <option value="oldest">Più vecchie</option>
                    <option value="most_results">Più risultati</option>
                    <option value="fastest">Più veloci</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {searches.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Nessuna ricerca nella cronologia</p>
            </div>
          ) : (
            <>
              {searches.map((search) => (
                <div 
                  key={search.id}
                  className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-purple-300 p-4 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => openSearchInOriginalView(search.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        <ThumbnailImage 
                          src={search.imageUrl || ''} 
                          alt="Search preview"
                          className="w-full h-full"
                        />
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          {search.searchType === 'general_search' ? 'Ricerca Generale' : 
                           search.searchType === 'copyright_detection' ? 'Rilevamento Copyright' :
                           search.searchType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(search.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSearch(search.id)
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(search.status, search.resultsCount)}
                        <span className="text-sm text-gray-700">
                          {getStatusText(search.status, search.resultsCount)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{search.searchTime ? `${search.searchTime}ms` : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {Object.keys(search.providersUsed || {}).length} provider
                    </div>
                  </div>
                </div>
              ))}

              {pagination.hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Caricamento...
                      </>
                    ) : (
                      'Carica Altri'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}