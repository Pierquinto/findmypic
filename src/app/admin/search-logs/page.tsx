'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Download,
  MapPin,
  Globe,
  Server,
  Image as ImageIcon
} from 'lucide-react'

interface SearchLogEntry {
  id: string
  searchId: string
  userId?: string
  email?: string
  imageStoragePath?: string
  imageHash?: string
  imageSize?: number
  imageMimeType?: string
  ipAddress?: string
  userAgent?: string
  geoLocation?: {
    country?: string
    city?: string
    region?: string
    timezone?: string
    isp?: string
  }
  searchType: string
  searchQuery?: any
  providersAttempted?: string[]
  providersSuccessful?: string[]
  providersFailed?: any[]
  totalResults: number
  searchTimeMs?: number
  processingSteps?: any[]
  errorLogs?: any[]
  warnings?: any[]
  apiCallsCount: number
  status: string
  createdAt: string
  user?: {
    email: string
    plan: string
  }
}

export default function SearchLogsPage() {
  const { user, userProfile, loading: authLoading, apiRequest } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<SearchLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<SearchLogEntry | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'recent'>('all')

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchLogs()
  }, [user, userProfile, authLoading, router, filter])

  const fetchLogs = async () => {
    try {
      const response = await apiRequest(`/api/admin/search-logs?filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      } else {
        console.error('Error fetching logs')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completata</span>
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Fallita</span>
      case 'processing':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">In corso</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const downloadImage = async (logEntry: SearchLogEntry) => {
    if (!logEntry.imageStoragePath) return
    
    try {
      const response = await fetch(`/api/search-images/${logEntry.searchId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `search_image_${logEntry.searchId}.${logEntry.imageMimeType?.split('/')[1] || 'jpg'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
          <p className="text-gray-600">Caricamento log ricerche...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/admin" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Search className="h-6 w-6 mr-2 text-purple-600" />
                  Log Ricerche Dettagliati
                </h1>
                <p className="text-gray-600">Monitoraggio completo di tutte le ricerche effettuate</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tutte</option>
                <option value="completed">Completate</option>
                <option value="failed">Fallite</option>
                <option value="recent">Ultime 24h</option>
              </select>
              
              <button
                onClick={fetchLogs}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Aggiorna
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Completate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.filter(l => l.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Fallite</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.filter(l => l.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Tempo Medio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(
                    logs.filter(l => l.searchTimeMs).reduce((acc, l) => acc + (l.searchTimeMs || 0), 0) / 
                    logs.filter(l => l.searchTimeMs).length
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">API Calls Totali</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.reduce((acc, l) => acc + l.apiCallsCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Logs Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Log Ricerche ({logs.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ricerca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risultati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durata
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.searchId.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.searchType}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {log.email || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          {log.geoLocation?.city && (
                            <>
                              <MapPin className="h-3 w-3 mr-1" />
                              {log.geoLocation.city}, {log.geoLocation.country}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {log.providersSuccessful?.map(provider => (
                          <span key={provider} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {provider}
                          </span>
                        ))}
                        {log.providersFailed?.map(failed => (
                          <span key={failed.provider} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            {failed.provider}
                          </span>
                        ))}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.totalResults}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(log.searchTimeMs)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString('it-IT')}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {log.imageStoragePath && (
                        <button
                          onClick={() => downloadImage(log)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {logs.length === 0 && (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Nessun log trovato per i filtri selezionati</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Dettagli Ricerca: {selectedLog.searchId}
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Informazioni Base</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Utente:</strong> {selectedLog.email || 'N/A'}</p>
                    <p><strong>Tipo:</strong> {selectedLog.searchType}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedLog.status)}</p>
                    <p><strong>Durata:</strong> {formatDuration(selectedLog.searchTimeMs)}</p>
                    <p><strong>API Calls:</strong> {selectedLog.apiCallsCount}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Immagine</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Hash:</strong> {selectedLog.imageHash?.substring(0, 16)}...</p>
                    <p><strong>Dimensione:</strong> {formatFileSize(selectedLog.imageSize)}</p>
                    <p><strong>Tipo:</strong> {selectedLog.imageMimeType}</p>
                    {selectedLog.imageStoragePath && (
                      <button
                        onClick={() => downloadImage(selectedLog)}
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Scarica Immagine
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing Steps */}
              {selectedLog.processingSteps && selectedLog.processingSteps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Step di Elaborazione</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedLog.processingSteps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            {step.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                            )}
                            {step.step}
                            {step.provider && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {step.provider}
                              </span>
                            )}
                          </span>
                          <span className="text-gray-500">
                            {step.duration ? `${step.duration}ms` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Errors and Warnings */}
              {(selectedLog.errorLogs?.length || selectedLog.warnings?.length) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedLog.errorLogs && selectedLog.errorLogs.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">Errori</h4>
                      <div className="bg-red-50 rounded-lg p-4">
                        {selectedLog.errorLogs.map((error, index) => (
                          <p key={index} className="text-red-800 text-sm mb-1">
                            {error.step}: {error.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedLog.warnings && selectedLog.warnings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-2">Warning</h4>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        {selectedLog.warnings.map((warning, index) => (
                          <p key={index} className="text-yellow-800 text-sm mb-1">
                            {warning.step}: {warning.warning}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}