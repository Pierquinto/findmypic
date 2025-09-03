'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import ThumbnailImage from '@/components/OptimizedImage'
import { 
  Image as ImageIcon, 
  Filter, 
  Eye, 
  Download, 
  RefreshCw,
  Calendar,
  User,
  Hash,
  Unlock,
  Lock,
  Search,
  Grid,
  List,
  ZoomIn,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface ImageSearch {
  id: string
  userId: string
  imageUrl?: string
  encryptedImagePath?: string
  decryptedImagePath?: string
  imageHash?: string
  searchType: string
  status: string
  resultsCount: number
  searchTime?: number
  createdAt: string
  user: {
    id: string
    email: string
  }
}

interface ImageStats {
  totalImages: number
  todayImages: number
  averageFileSize: number
  mostUsedFormat: string
  storageUsed: number
}

export default function ImagesUploaded() {
  const { user, userProfile, loading: authLoading, apiRequest } = useAuth()
  const router = useRouter()
  const [images, setImages] = useState<ImageSearch[]>([])
  const [stats, setStats] = useState<ImageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [decryptionEnabled, setDecryptionEnabled] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageSearch | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState({
    userId: '',
    searchType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchImages()
    fetchImageStats()
  }, [user, authLoading, router, filters])

  const fetchImages = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      
      // Filtro specifico per immagini
      params.append('hasImage', 'yes')
      
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
        setImages(data.searches)
      }
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchImageStats = async () => {
    try {
      const response = await apiRequest('/api/admin/searches/image-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching image stats:', error)
    }
  }

  const toggleDecryption = async () => {
    if (!decryptionEnabled) {
      const confirmed = window.confirm(
        'Attenzione: Stai per abilitare la visualizzazione delle immagini caricate dagli utenti. ' +
        'Questa azione verrà registrata nei log di sistema. Continuare?'
      )
      if (!confirmed) return
    }

    setDecryptionEnabled(!decryptionEnabled)
    await fetchImages()
  }

  const viewImageDetails = (image: ImageSearch) => {
    setSelectedImage(image)
    setShowImageModal(true)
  }

  const exportImages = async () => {
    try {
      const params = new URLSearchParams()
      params.append('hasImage', 'yes')
      params.append('includeDecrypted', decryptionEnabled.toString())
      
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
        a.download = `images-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting images:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
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
              {decryptionEnabled ? 'Disabilita' : 'Abilita'} Visualizzazione
            </button>
            {decryptionEnabled && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-700 text-sm font-medium">
                  ⚠️ Modalità Visualizzazione Attiva
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 border border-slate-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchImages}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
            <button
              onClick={exportImages}
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
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Immagini Totali</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalImages.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 text-sm font-medium">{stats.todayImages} oggi</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <Hash className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Storage Usato</p>
                  <p className="text-3xl font-bold text-slate-900">{Math.round(stats.storageUsed / 1024 / 1024)}MB</p>
                  <div className="flex items-center mt-1">
                    <ImageIcon className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 text-sm font-medium">{stats.mostUsedFormat}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <ZoomIn className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Dimensione Media</p>
                  <p className="text-3xl font-bold text-slate-900">{Math.round(stats.averageFileSize / 1024)}KB</p>
                  <div className="flex items-center mt-1">
                    <ImageIcon className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-purple-600 text-sm font-medium">per immagine</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Ricerche Riuscite</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {images.filter(img => img.status === 'completed').length}
                  </p>
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-600 text-sm font-medium">
                      {images.length > 0 ? Math.round((images.filter(img => img.status === 'completed').length / images.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Utente</label>
              <input
                type="text"
                placeholder="user@example.com"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Ricerca</label>
              <select
                value={filters.searchType}
                onChange={(e) => setFilters({ ...filters, searchType: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti i tipi</option>
                <option value="general_search">Ricerca Generale</option>
                <option value="reverse_image">Ricerca Inversa</option>
                <option value="copyright_check">Controllo Copyright</option>
                <option value="revenge_detection">Rilevazione Revenge Porn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli stati</option>
                <option value="completed">Completate</option>
                <option value="failed">Fallite</option>
                <option value="processing">In elaborazione</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Da</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data A</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  userId: '',
                  searchType: 'all',
                  status: 'all',
                  dateFrom: '',
                  dateTo: '',
                  search: ''
                })}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors w-full"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Images Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {images.map((image) => (
                <div key={image.id} className="group border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-square bg-slate-100 relative">
                    {decryptionEnabled && image.decryptedImagePath ? (
                      <ThumbnailImage
                        src={image.decryptedImagePath}
                        alt="User uploaded"
                        className="w-full h-full"
                      />
                    ) : image.imageUrl ? (
                      <ThumbnailImage
                        src={image.imageUrl}
                        alt="User uploaded"
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-16 w-16 text-slate-300" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2">
                      {getStatusIcon(image.status)}
                    </div>
                    
                    <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                      <button
                        onClick={() => viewImageDetails(image)}
                        className="bg-white text-slate-900 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-100"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-slate-400 mr-1" />
                        <span className="text-sm text-slate-600 truncate">{image.user.email}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(image.status)}`}>
                        {image.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(image.createdAt).toLocaleDateString('it-IT')}
                      </div>
                      <div className="flex items-center">
                        <Search className="h-3 w-3 mr-1" />
                        {image.resultsCount} risultati
                      </div>
                      {image.imageHash && (
                        <div className="flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          {image.imageHash.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Immagine
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
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {images.map((image) => (
                    <tr key={image.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {decryptionEnabled && image.decryptedImagePath ? (
                            <img
                              src={image.decryptedImagePath}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : image.imageUrl ? (
                            <img
                              src={image.imageUrl}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-slate-400 mr-2" />
                          <div className="text-sm font-medium text-slate-900">{image.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {image.searchType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(image.status)}
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(image.status)}`}>
                            {image.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {image.resultsCount} risultati
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(image.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewImageDetails(image)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizza dettagli"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {image.imageHash && (
                            <button
                              onClick={() => alert(`Hash immagine: ${image.imageHash}`)}
                              className="text-slate-600 hover:text-slate-900"
                              title="Mostra hash"
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
          )}
        </div>

        {/* Image Details Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Dettagli Immagine</h3>
                  <button
                    onClick={() => {
                      setShowImageModal(false)
                      setSelectedImage(null)
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Image Display */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      {decryptionEnabled && selectedImage.decryptedImagePath ? (
                        <img
                          src={selectedImage.decryptedImagePath}
                          alt="Immagine caricata"
                          className="w-full max-h-96 object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : selectedImage.imageUrl ? (
                        <img
                          src={selectedImage.imageUrl}
                          alt="Immagine caricata"
                          className="w-full max-h-96 object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <ImageIcon className="h-16 w-16 text-slate-300 mb-4" />
                          <p className="text-slate-500">Immagine non disponibile</p>
                          {!decryptionEnabled && (
                            <p className="text-sm text-slate-400 mt-2">Abilita decrittografia per visualizzare</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Informazioni Ricerca</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>ID:</strong> {selectedImage.id}</div>
                        <div><strong>Utente:</strong> {selectedImage.user.email}</div>
                        <div><strong>Tipo:</strong> {selectedImage.searchType}</div>
                        <div><strong>Status:</strong> 
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedImage.status)}`}>
                            {selectedImage.status}
                          </span>
                        </div>
                        <div><strong>Risultati:</strong> {selectedImage.resultsCount}</div>
                        {selectedImage.searchTime && (
                          <div><strong>Tempo ricerca:</strong> {selectedImage.searchTime}ms</div>
                        )}
                        <div><strong>Data caricamento:</strong> {new Date(selectedImage.createdAt).toLocaleString('it-IT')}</div>
                      </div>
                    </div>

                    {selectedImage.imageHash && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Identificazione</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Hash immagine:</strong></div>
                          <div className="bg-slate-100 p-2 rounded text-xs font-mono break-all">
                            {selectedImage.imageHash}
                          </div>
                        </div>
                      </div>
                    )}

                    {decryptionEnabled && selectedImage.decryptedImagePath && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Percorso (Decrittografato)</h4>
                        <div className="bg-red-50 border border-red-200 p-3 rounded">
                          <p className="text-red-700 text-xs font-mono break-all">
                            {selectedImage.decryptedImagePath}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}