'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Globe, 
  Trash2, 
  Filter,
  ChevronDown,
  Plus,
  Search,
  Eye,
  Calendar,
  Shield,
  TrendingUp,
  MoreVertical,
  Download,
  Archive
} from 'lucide-react'

interface Violation {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  category: string
  siteName: string
  imageUrl: string | null
  webPageUrl: string | null
  similarity: number | null
  provider: string | null
  thumbnail: string | null
  detectedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function ViolationsPage() {
  const { user, loading: authLoading  } = useAuth()
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination
  const [limit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    urgent: 0
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      redirect('/login')
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user) {
      fetchViolations()
      fetchStats()
    }
  }, [user, statusFilter, priorityFilter, categoryFilter, searchQuery, offset])

  const fetchViolations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      
      const response = await fetch(`/api/violations?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch violations')
      }
      
      const data = await response.json()
      setViolations(data.violations || [])
      setTotalCount(data.totalCount || 0)
      setHasMore(data.pagination?.hasMore || false)
      
    } catch (error) {
      console.error('Error fetching violations:', error)
      setError('Errore nel caricamento delle violazioni')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/violations?stats=true')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const updateViolationStatus = async (violationId: string, status: string) => {
    try {
      const response = await fetch(`/api/violations/${violationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        // Refresh violations list
        fetchViolations()
      }
    } catch (error) {
      console.error('Error updating violation:', error)
    }
  }

  const deleteViolation = async (violationId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa violazione?')) return
    
    try {
      const response = await fetch(`/api/violations/${violationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Refresh violations list
        fetchViolations()
      }
    } catch (error) {
      console.error('Error deleting violation:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'investigating': return 'bg-blue-100 text-blue-800'
      case 'dismissed': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      case 'investigating': return <Clock className="h-4 w-4" />
      case 'dismissed': return <XCircle className="h-4 w-4" />
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return 'Risolto'
      case 'investigating': return 'In corso'
      case 'dismissed': return 'Archiviato'
      case 'pending': return 'In attesa'
      default: return status
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Violazioni" description="Gestisci le violazioni trovate nelle tue ricerche">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Violazioni" description="Gestisci le violazioni trovate nelle tue ricerche">
      <div className="space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Totali</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">In Attesa</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">In Corso</p>
                <p className="text-xl font-bold text-gray-900">{stats.investigating}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Risolte</p>
                <p className="text-xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Urgenti</p>
                <p className="text-xl font-bold text-gray-900">{stats.urgent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca violazioni..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtri
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Export Button */}
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stato
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setOffset(0)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="pending">In attesa</option>
                    <option value="investigating">In corso</option>
                    <option value="resolved">Risolto</option>
                    <option value="dismissed">Archiviato</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorità
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value)
                      setOffset(0)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Tutte le priorità</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Bassa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value)
                      setOffset(0)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Tutte le categorie</option>
                    <option value="copyright">Copyright</option>
                    <option value="revenge">Revenge</option>
                    <option value="harassment">Molestie</option>
                    <option value="general">Generale</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Violations List */}
        {violations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna violazione trovata
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                ? 'Prova a modificare i filtri per vedere più risultati.'
                : 'Le violazioni che salvi dalle ricerche appariranno qui.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setPriorityFilter('all')
                  setCategoryFilter('all')
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Archive className="h-4 w-4 mr-2" />
                Rimuovi filtri
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {violations.map((violation) => (
              <div 
                key={violation.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {violation.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(violation.priority)}`}>
                        {violation.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                        {getStatusIcon(violation.status)}
                        {getStatusText(violation.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="space-y-2">
                        <p><span className="font-medium">Sito:</span> {violation.siteName}</p>
                        {violation.similarity && (
                          <p><span className="font-medium">Similarità:</span> {Math.round(violation.similarity)}%</p>
                        )}
                        {violation.provider && (
                          <p><span className="font-medium">Provider:</span> {violation.provider}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        {violation.detectedAt && (
                          <p className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span className="font-medium">Rilevato:</span> {new Date(violation.detectedAt).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {violation.description && (
                          <p><span className="font-medium">Descrizione:</span> {violation.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-6">
                    {/* Status Update */}
                    <select
                      value={violation.status}
                      onChange={(e) => updateViolationStatus(violation.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="pending">In attesa</option>
                      <option value="investigating">In corso</option>
                      <option value="resolved">Risolto</option>
                      <option value="dismissed">Archiviato</option>
                    </select>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      {violation.imageUrl && (
                        <a
                          href={violation.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Visualizza immagine"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {violation.webPageUrl && (
                        <a
                          href={violation.webPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Visualizza pagina web"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteViolation(violation.id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Elimina violazione"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {violations.length > 0 && hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => setOffset(offset + limit)}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Carica altri risultati
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}