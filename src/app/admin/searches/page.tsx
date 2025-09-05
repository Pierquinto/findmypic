'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import ThumbnailImage from '@/components/OptimizedImage'
import { 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  Image as ImageIcon, 
  Download, 
  RefreshCw,
  Calendar,
  User,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Unlock,
  Lock,
  Hash,
  Globe,
  Grid3X3,
  List,
  ZoomIn,
  ExternalLink,
  Info,
  ChevronDown
} from 'lucide-react'


interface SearchRecord {
  id: string
  userId: string
  imageUrl?: string
  encryptedImagePath?: string
  encryptedResults?: any
  results: any
  searchType: string
  providersUsed?: any
  searchTime?: number
  resultsCount: number
  ipAddress?: string
  userAgent?: string
  imageHash?: string
  status: string
  createdAt: string
  user: {
    id: string
    email: string
  }
  // Campi decrittografati (solo per admin)
  decryptedResults?: any
  decryptedImagePath?: string
  decryptedIpAddress?: string
  decryptedUserAgent?: string
  // URL per l'anteprima dell'immagine
  imagePreviewUrl?: string
}

interface SearchStats {
  totalSearches: number
  todaySearches: number
  successfulSearches: number
  failedSearches: number
  avgSearchTime: number
  topProviders: Array<{ name: string; count: number }>
  topSearchTypes: Array<{ type: string; count: number }>
}

export default function SearchesManagement() {
  const { user, userProfile, loading: authLoading, apiRequest } = useAuth()
  const router = useRouter()
  const [searches, setSearches] = useState<SearchRecord[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [decryptionEnabled, setDecryptionEnabled] = useState(false)
  const [selectedSearch, setSelectedSearch] = useState<SearchRecord | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    userId: '',
    searchType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    hasImage: 'all'
  })

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchSearches()
    fetchSearchStats()
  }, [user, authLoading, router, filters])

  const fetchSearches = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      if (decryptionEnabled) {
        params.append('decrypt', 'true')
      }

      const response = await apiRequest(`/api/admin/searches?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSearches(data?.searches || [])
      }
    } catch (error) {
      console.error('Error fetching searches:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchSearchStats = async () => {
    try {
      const response = await apiRequest('/api/admin/search-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data || null)
      }
    } catch (error) {
      console.error('Error fetching search stats:', error)
    }
  }

  const exportSearches = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      const response = await apiRequest(`/api/admin/searches/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `searches-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting searches:', error)
    }
  }

  const toggleDecryption = async () => {
    if (!decryptionEnabled) {
      // Chiedi conferma prima di abilitare la decrittografia
      const confirmed = window.confirm(
        'Attenzione: Stai per abilitare la visualizzazione di dati sensibili decrittografati. ' +
        'Questa azione verrà registrata nei log di sistema. Continuare?'
      )
      if (!confirmed) return
    }

    setDecryptionEnabled(!decryptionEnabled)
    await fetchSearches() // Ricarica i dati con/senza decrittografia
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const viewSearchDetails = (search: SearchRecord) => {
    setSelectedSearch(search)
  }

  const viewImage = (search: SearchRecord) => {
    setSelectedSearch(search)
    setShowImageModal(true)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Actions Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDecryption}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                decryptionEnabled 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {decryptionEnabled ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {decryptionEnabled ? 'Disabilita' : 'Abilita'} Decrittografia
            </button>
            {decryptionEnabled && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-700 text-sm font-medium">
                  ⚠️ Modalità Decrittografia Attiva
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSearches}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
            <button
              onClick={exportSearches}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Ricerche Totali</p>
                  <p className="text-3xl font-bold text-slate-900">{stats?.totalSearches?.toLocaleString() || '0'}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 text-sm font-medium">{stats?.todaySearches || 0} oggi</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Successo</p>
                  <p className="text-3xl font-bold text-slate-900">{stats?.successfulSearches || 0}</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 text-sm font-medium">
                      {stats && stats.totalSearches > 0 
                        ? ((stats.successfulSearches / stats.totalSearches) * 100).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-red-50 p-3 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Fallite</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.failedSearches}</p>
                  <div className="flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 text-sm font-medium">
                      {((stats.failedSearches / stats.totalSearches) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Tempo Medio</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.avgSearchTime}ms</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-purple-600 text-sm font-medium">risposta media</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Controls and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Vista:</span>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('gallery')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'gallery'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-1.5" />
                  Gallery
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Tabella
                </button>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                  placeholder="Cerca per email utente..."
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Ricerca</label>
              <select
                value={filters.searchType}
                onChange={(e) => setFilters({ ...filters, searchType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutti i tipi</option>
                <option value="general_search">Ricerca Generale</option>
                <option value="reverse_image">Ricerca Inversa</option>
                <option value="copyright_check">Controllo Copyright</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutti gli stati</option>
                <option value="completed">Completate</option>
                <option value="failed">Fallite</option>
                <option value="processing">In elaborazione</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ha Immagini</label>
              <select
                value={filters.hasImage}
                onChange={(e) => setFilters({ ...filters, hasImage: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutte</option>
                <option value="yes">Con immagini</option>
                <option value="no">Senza immagini</option>
              </select>
            </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      userId: '',
                      searchType: 'all',
                      status: 'all',
                      dateFrom: '',
                      dateTo: '',
                      search: '',
                      hasImage: 'all'
                    })}
                    className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Reset Filtri
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Da</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data A</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
                </div>
              </div>
            </div>
          )}
            </div>

        {/* Gallery View */}
        {viewMode === 'gallery' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
              >
                {/* Image Preview */}
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  {search.imagePreviewUrl ? (
                    <ThumbnailImage
                      src={search.imagePreviewUrl}
                      alt="Search preview"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Anteprima non disponibile</p>
                      </div>
                    </div>
                  )}
                      
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(search.status)}`}>
                      {getStatusIcon(search.status)}
                    </span>
                  </div>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-opacity-0 group-hover:bg-black group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center z-20">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <button
                        onClick={() => viewImage(search)}
                        className="bg-white bg-opacity-90 hover:bg-opacity-100 text-slate-900 p-2 rounded-lg transition-all"
                        title="Visualizza immagine"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => viewSearchDetails(search)}
                        className="bg-white bg-opacity-90 hover:bg-opacity-100 text-slate-900 p-2 rounded-lg transition-all"
                        title="Visualizza dettagli"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* User and Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <User className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 truncate" title={search.user?.email || 'Utente Anonimo'}>
                          {search.user?.email || 'Utente Anonimo'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 ml-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(search.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>

                    {/* Search Type */}
                    <div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {search.searchType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Results and Time */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-slate-600">
                        <Target className="h-4 w-4 mr-1" />
                        <span>{search.resultsCount} risultati</span>
                      </div>
                      {search.searchTime && (
                        <div className="flex items-center text-slate-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{search.searchTime}ms</span>
                        </div>
                      )}
                    </div>

                    {/* IP Address (if decryption enabled) */}
                    {decryptionEnabled && search.decryptedIpAddress && (
                      <div className="text-xs text-slate-500">
                        IP: {search.decryptedIpAddress}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewSearchDetails(search)}
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                          title="Visualizza dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {search.imageHash && (
                          <button
                            onClick={() => alert(`Hash immagine: ${search.imageHash}`)}
                            className="text-slate-600 hover:text-slate-900 transition-colors"
                            title="Mostra hash immagine"
                          >
                            <Hash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => viewImage(search)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Visualizza immagine"
                      >
                        <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Data/Ora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Risultati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tempo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Immagine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {searches.map((search) => (
                  <tr key={search.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                        {new Date(search.createdAt).toLocaleString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-slate-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{search.user?.email || 'Utente Anonimo'}</div>
                          {decryptionEnabled && search.decryptedIpAddress && (
                            <div className="text-xs text-slate-500">IP: {search.decryptedIpAddress}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {search.searchType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(search.status)}
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(search.status)}`}>
                          {search.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-slate-400 mr-2" />
                        {search.resultsCount} risultati
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {search.searchTime ? `${search.searchTime}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        {search.imagePreviewUrl ? (
                        <button
                          onClick={() => viewImage(search)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizza immagine"
                        >
                          <ImageIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewSearchDetails(search)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizza dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {search.imageHash && (
                          <button
                            onClick={() => alert(`Hash immagine: ${search.imageHash}`)}
                            className="text-slate-600 hover:text-slate-900"
                            title="Mostra hash immagine"
                          >
                            <Hash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Empty State */}
        {searches.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nessuna ricerca trovata
            </h3>
            <p className="text-slate-600 mb-6">
              Prova a modificare i filtri per vedere più risultati.
            </p>
            <button
              onClick={() => setFilters({
                userId: '',
                searchType: 'all',
                status: 'all',
                dateFrom: '',
                dateTo: '',
                search: '',
                hasImage: 'all'
              })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Rimuovi filtri
            </button>
          </div>
        )}

        {/* Search Details Modal */}
        {selectedSearch && !showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Dettagli Ricerca</h3>
                  <button
                    onClick={() => setSelectedSearch(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Informazioni Generali</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>ID:</strong> {selectedSearch.id}</div>
                      <div><strong>Utente:</strong> {selectedSearch.user?.email || 'Utente Anonimo'}</div>
                      <div><strong>Tipo:</strong> {selectedSearch.searchType}</div>
                      <div><strong>Status:</strong> {selectedSearch.status}</div>
                      <div><strong>Data:</strong> {new Date(selectedSearch.createdAt).toLocaleString('it-IT')}</div>
                      {selectedSearch.searchTime && (
                        <div><strong>Tempo:</strong> {selectedSearch.searchTime}ms</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Risultati</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Numero risultati:</strong> {selectedSearch.resultsCount}</div>
                      {selectedSearch.providersUsed && (
                        <div><strong>Provider usati:</strong> {Object.keys(selectedSearch.providersUsed).join(', ')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {decryptionEnabled && selectedSearch.decryptedResults && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-900 mb-2">Risultati Decrittografati</h4>
                    <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedSearch.decryptedResults, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-2">Risultati Pubblici</h4>
                  <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedSearch.results, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Immagine Ricerca</h3>
                  <button
                    onClick={() => {
                      setShowImageModal(false)
                      setSelectedSearch(null)
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="text-center">
                  {selectedSearch.imagePreviewUrl ? (
                    <div className="relative max-w-full max-h-96 mx-auto">
                      <ThumbnailImage
                        src={selectedSearch.imagePreviewUrl}
                        alt="Immagine ricerca"
                        className="max-w-full max-h-96 rounded-lg shadow-lg"
                      />
                    </div>
                  ) : decryptionEnabled && selectedSearch.decryptedImagePath ? (
                    <div>
                      <p className="text-slate-600 mb-4">Percorso immagine decrittografato:</p>
                      <code className="bg-slate-100 px-3 py-2 rounded text-sm">{selectedSearch.decryptedImagePath}</code>
                    </div>
                  ) : (
                    <div className="py-12">
                      <ImageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Immagine non disponibile o crittografata</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}