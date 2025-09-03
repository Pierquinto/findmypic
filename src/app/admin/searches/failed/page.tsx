'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  AlertTriangle, 
  Filter, 
  Eye, 
  Download, 
  RefreshCw,
  Calendar,
  User,
  Clock,
  XCircle,
  Search,
  TrendingDown,
  AlertCircle,
  Bug,
  Wifi,
  Database,
  Unlock,
  Lock
} from 'lucide-react'

interface FailedSearch {
  id: string
  userId: string
  searchType: string
  status: string
  searchTime?: number
  createdAt: string
  results: any
  providersUsed?: any
  user: {
    id: string
    email: string
  }
  // Campi decrittografati
  decryptedResults?: any
  decryptedIpAddress?: string
  decryptedUserAgent?: string
}

interface FailureStats {
  totalFailed: number
  todayFailed: number
  topFailureReasons: Array<{ reason: string; count: number }>
  failureRate: number
  mostProblematicProvider: string
  avgFailureTime: number
}

export default function FailedSearches() {
  const { user, loading: authLoading  } = useAuth()
  const router = useRouter()
  const [failedSearches, setFailedSearches] = useState<FailedSearch[]>([])
  const [stats, setStats] = useState<FailureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [decryptionEnabled, setDecryptionEnabled] = useState(false)
  const [selectedSearch, setSelectedSearch] = useState<FailedSearch | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [filters, setFilters] = useState({
    userId: '',
    searchType: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    failureReason: 'all'
  })

  useEffect(() => {
    if (!authLoading && user) return
    
    if (!session || !(session.user as any).isAdmin) {
      router.push('/login')
      return
    }

    fetchFailedSearches()
    fetchFailureStats()
  }, [session, status, router, filters])

  const fetchFailedSearches = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      
      // Filtro specifico per ricerche fallite
      params.append('status', 'failed')
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      if (decryptionEnabled) {
        params.append('decrypt', 'true')
      }

      const response = await fetch(`/api/admin/searches?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFailedSearches(data.searches)
      }
    } catch (error) {
      console.error('Error fetching failed searches:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchFailureStats = async () => {
    try {
      const response = await fetch('/api/admin/searches/failure-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching failure stats:', error)
    }
  }

  const toggleDecryption = async () => {
    if (!decryptionEnabled) {
      const confirmed = window.confirm(
        'Attenzione: Stai per abilitare la visualizzazione di dati tecnici dettagliati sui fallimenti. ' +
        'Questa azione verrà registrata nei log di sistema. Continuare?'
      )
      if (!confirmed) return
    }

    setDecryptionEnabled(!decryptionEnabled)
    await fetchFailedSearches()
  }

  const viewSearchDetails = (search: FailedSearch) => {
    setSelectedSearch(search)
    setShowDetailsModal(true)
  }

  const exportFailedSearches = async () => {
    try {
      const params = new URLSearchParams()
      params.append('status', 'failed')
      params.append('includeDecrypted', decryptionEnabled.toString())
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/admin/searches/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `failed-searches-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting failed searches:', error)
    }
  }

  const getFailureReason = (search: FailedSearch): string => {
    if (search.results?.error) {
      if (typeof search.results.error === 'string') {
        return search.results.error
      }
      return 'Errore generico'
    }
    if (!search.providersUsed || Object.keys(search.providersUsed).length === 0) {
      return 'Nessun provider disponibile'
    }
    if (search.searchTime && search.searchTime > 30000) {
      return 'Timeout ricerca'
    }
    return 'Motivo sconosciuto'
  }

  const getFailureIcon = (reason: string) => {
    if (reason.toLowerCase().includes('timeout') || reason.toLowerCase().includes('tempo')) {
      return <Clock className="h-4 w-4 text-yellow-500" />
    } else if (reason.toLowerCase().includes('provider') || reason.toLowerCase().includes('connessione')) {
      return <Wifi className="h-4 w-4 text-red-500" />
    } else if (reason.toLowerCase().includes('database') || reason.toLowerCase().includes('storage')) {
      return <Database className="h-4 w-4 text-purple-500" />
    } else {
      return <Bug className="h-4 w-4 text-orange-500" />
    }
  }

  const retrySearch = async (searchId: string) => {
    if (!window.confirm('Vuoi riprovare questa ricerca? Verrà creata una nuova richiesta.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/searches/${searchId}/retry`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Ricerca rilanciata con successo!')
        fetchFailedSearches()
      } else {
        alert('Errore nel rilanciare la ricerca')
      }
    } catch (error) {
      console.error('Error retrying search:', error)
      alert('Errore nel rilanciare la ricerca')
    }
  }

  if (!authLoading && user || loading) {
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
              {decryptionEnabled ? 'Disabilita' : 'Abilita'} Debug Info
            </button>
            {decryptionEnabled && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-700 text-sm font-medium">
                  ⚠️ Modalità Debug Attiva
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchFailedSearches}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
            <button
              onClick={exportFailedSearches}
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
                <div className="bg-red-50 p-3 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Ricerche Fallite</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalFailed.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 text-sm font-medium">{stats.todayFailed} oggi</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Tasso Fallimento</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.failureRate.toFixed(1)}%</p>
                  <div className="flex items-center mt-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-yellow-600 text-sm font-medium">delle ricerche</span>
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
                  <p className="text-sm font-medium text-slate-600">Tempo Medio Fallimento</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.avgFailureTime}ms</p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-purple-600 text-sm font-medium">prima del fallimento</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Provider Problematico</p>
                  <p className="text-lg font-bold text-slate-900">{stats.mostProblematicProvider || 'N/A'}</p>
                  <div className="flex items-center mt-1">
                    <Wifi className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-600 text-sm font-medium">più fallimenti</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Failure Reasons */}
        {stats && stats.topFailureReasons.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Principali Cause di Fallimento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.topFailureReasons.slice(0, 6).map((reason, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    {getFailureIcon(reason.reason)}
                    <span className="ml-2 text-sm font-medium text-slate-700 truncate">{reason.reason}</span>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {reason.count}
                  </span>
                </div>
              ))}
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Causa Fallimento</label>
              <select
                value={filters.failureReason}
                onChange={(e) => setFilters({ ...filters, failureReason: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutte le cause</option>
                <option value="timeout">Timeout</option>
                <option value="provider">Problemi Provider</option>
                <option value="network">Errori Rete</option>
                <option value="system">Errori Sistema</option>
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
                  dateFrom: '',
                  dateTo: '',
                  search: '',
                  failureReason: 'all'
                })}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors w-full"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Failed Searches Table */}
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
                    Causa Fallimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tempo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {failedSearches.map((search) => {
                  const failureReason = getFailureReason(search)
                  return (
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
                            <div className="text-sm font-medium text-slate-900">{search.user.email}</div>
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
                          {getFailureIcon(failureReason)}
                          <span className="ml-2 text-sm text-slate-900 truncate max-w-xs" title={failureReason}>
                            {failureReason}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {search.searchTime ? `${search.searchTime}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {search.providersUsed ? Object.keys(search.providersUsed).join(', ') || 'Nessuno' : 'Nessuno'}
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
                          <button
                            onClick={() => retrySearch(search.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Riprova ricerca"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search Details Modal */}
        {showDetailsModal && selectedSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Dettagli Ricerca Fallita</h3>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedSearch(null)
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Informazioni Generali</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>ID:</strong> {selectedSearch.id}</div>
                      <div><strong>Utente:</strong> {selectedSearch.user.email}</div>
                      <div><strong>Tipo:</strong> {selectedSearch.searchType}</div>
                      <div><strong>Data:</strong> {new Date(selectedSearch.createdAt).toLocaleString('it-IT')}</div>
                      <div><strong>Tempo fallimento:</strong> {selectedSearch.searchTime ? `${selectedSearch.searchTime}ms` : 'N/A'}</div>
                      <div><strong>Causa:</strong> {getFailureReason(selectedSearch)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Provider Utilizzati</h4>
                    <div className="space-y-2 text-sm">
                      {selectedSearch.providersUsed && Object.keys(selectedSearch.providersUsed).length > 0 ? (
                        Object.entries(selectedSearch.providersUsed).map(([provider, status]) => (
                          <div key={provider} className="flex justify-between">
                            <span>{provider}:</span>
                            <span className={`px-2 py-1 text-xs rounded ${status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {status ? 'OK' : 'Fallito'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500">Nessun provider utilizzato</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-2">Errore Dettagliato</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedSearch.results, null, 2)}
                    </pre>
                  </div>
                </div>

                {decryptionEnabled && selectedSearch.decryptedResults && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-900 mb-2">Debug Info (Decrittografato)</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap overflow-x-auto max-h-64">
                        {JSON.stringify(selectedSearch.decryptedResults, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {decryptionEnabled && (selectedSearch.decryptedIpAddress || selectedSearch.decryptedUserAgent) && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-900 mb-2">Informazioni Tecniche (Decrittografate)</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm">
                      {selectedSearch.decryptedIpAddress && (
                        <div><strong>IP Address:</strong> {selectedSearch.decryptedIpAddress}</div>
                      )}
                      {selectedSearch.decryptedUserAgent && (
                        <div><strong>User Agent:</strong> {selectedSearch.decryptedUserAgent}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => retrySearch(selectedSearch.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Riprova Ricerca
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedSearch(null)
                    }}
                    className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}