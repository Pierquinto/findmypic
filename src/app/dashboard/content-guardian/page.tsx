'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/client';
import { useDropzone } from 'react-dropzone'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Shield, 
  Plus, 
  Upload, 
  Edit,
  Trash2,
  Play,
  Pause,
  Archive,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  Eye,
  Settings,
  Tag,
  Search,
  Download,
  BarChart3,
  TrendingUp
} from 'lucide-react'

interface ProtectedAsset {
  id: string
  name: string
  description?: string
  imageUrl: string
  tags: string[]
  monitoringEnabled: boolean
  monitoringFrequency: string
  lastMonitoredAt?: string
  totalViolations: number
  status: string
  createdAt: string
  updatedAt: string
  monitoringResults: MonitoringResult[]
}

interface MonitoringResult {
  id: string
  monitoringDate: string
  violationsFound: number
  newViolations: number
  resolvedViolations: number
  status: string
}

export default function ContentGuardianPage() {
  const { user, loading: authLoading, apiRequest } = useAuth()
  const [assets, setAssets] = useState<ProtectedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ProtectedAsset | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    description: '',
    tags: '',
    monitoringFrequency: 'weekly',
    file: null as File | null
  })

  const [stats, setStats] = useState({
    totalAssets: 0,
    activeMonitoring: 0,
    totalViolations: 0,
    violationsThisMonth: 0
  })

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/user/protected-assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setNewAsset(prev => ({ ...prev, file }))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  })

  const handleAddAsset = async () => {
    if (!newAsset.file || !newAsset.name.trim()) return

    setUploadingAsset(true)
    try {
      const formData = new FormData()
      formData.append('file', newAsset.file)
      formData.append('name', newAsset.name)
      formData.append('description', newAsset.description)
      formData.append('tags', newAsset.tags)
      formData.append('monitoringFrequency', newAsset.monitoringFrequency)

      const response = await fetch('/api/user/protected-assets', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        await fetchAssets()
        setShowAddModal(false)
        setNewAsset({
          name: '',
          description: '',
          tags: '',
          monitoringFrequency: 'weekly',
          file: null
        })
      }
    } catch (error) {
      console.error('Error adding asset:', error)
    } finally {
      setUploadingAsset(false)
    }
  }

  const toggleMonitoring = async (assetId: string, enabled: boolean) => {
    try {
      const response = await apiRequest(`/api/user/protected-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitoringEnabled: enabled })
      })

      if (response.ok) {
        await fetchAssets()
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error)
    }
  }

  const runManualCheck = async (assetId: string) => {
    try {
      const response = await apiRequest(`/api/user/protected-assets/${assetId}/check`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchAssets()
      }
    } catch (error) {
      console.error('Error running manual check:', error)
    }
  }

  const deleteAsset = async (assetId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo asset protetto?')) return

    try {
      const response = await apiRequest(`/api/user/protected-assets/${assetId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAssets()
        if (selectedAsset?.id === assetId) {
          setSelectedAsset(null)
          setShowDetailsModal(false)
        }
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
    }
  }

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Giornaliero'
      case 'weekly': return 'Settimanale'
      case 'monthly': return 'Mensile'
      default: return frequency
    }
  }

  const getStatusColor = (violations: number) => {
    if (violations === 0) return 'text-green-600 bg-green-100'
    if (violations < 5) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Content Guardian" description="Monitora e proteggi i tuoi contenuti digitali">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento Content Guardian...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Content Guardian" description="Monitora e proteggi i tuoi contenuti digitali">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Asset Protetti</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Monitoraggio Attivo</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMonitoring}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Violazioni Totali</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViolations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Questo Mese</p>
                <p className="text-2xl font-bold text-gray-900">{stats.violationsThisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                I Tuoi Contenuti Protetti
              </h2>
              <p className="text-gray-600 mt-1">
                Gestisci e monitora automaticamente i tuoi asset digitali
              </p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Asset
            </button>
          </div>
        </div>

        {/* Assets Grid */}
        {assets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nessun asset protetto
            </h3>
            <p className="text-gray-600 mb-6">
              Inizia aggiungendo le tue immagini per proteggerle da usi non autorizzati
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Aggiungi Primo Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="relative">
                  <img
                    src={asset.imageUrl}
                    alt={asset.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      asset.monitoringEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {asset.monitoringEnabled ? 'Attivo' : 'Paused'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.totalViolations)}`}>
                      {asset.totalViolations} violazioni
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">
                      {asset.name}
                    </h3>
                  </div>
                  
                  {asset.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {asset.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {asset.tags.map((tag) => (
                      <span key={tag} className="inline-flex px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{formatFrequency(asset.monitoringFrequency)}</span>
                    <span>
                      {asset.lastMonitoredAt ? 
                        `Ultimo: ${new Date(asset.lastMonitoredAt).toLocaleDateString('it-IT')}` : 
                        'Mai controllato'
                      }
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleMonitoring(asset.id, !asset.monitoringEnabled)}
                      className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        asset.monitoringEnabled
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {asset.monitoringEnabled ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pausa
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Avvia
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => runManualCheck(asset.id)}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      title="Controllo manuale"
                    >
                      <Search className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowDetailsModal(true)
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Vedi dettagli"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Asset Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  Aggiungi Nuovo Asset
                </h3>
                <p className="text-gray-600 mt-1">
                  Carica un'immagine per iniziare a monitorarla automaticamente
                </p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Immagine
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {newAsset.file ? (
                      <div className="space-y-2">
                        <img
                          src={URL.createObjectURL(newAsset.file)}
                          alt="Preview"
                          className="max-w-xs max-h-48 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-gray-600">{newAsset.file.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">
                          Trascina un'immagine qui, o clicca per selezionare
                        </p>
                        <p className="text-sm text-gray-500">
                          JPG, PNG, GIF, WebP (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Asset Details */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Asset *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Es. Logo aziendale, Foto profilo, etc."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={newAsset.description}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Breve descrizione dell'asset..."
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tag (separati da virgola)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={newAsset.tags}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="logo, brand, marketing, personale"
                  />
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Frequenza Monitoraggio
                  </label>
                  <select
                    id="frequency"
                    value={newAsset.monitoringFrequency}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, monitoringFrequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="daily">Giornaliero</option>
                    <option value="weekly">Settimanale</option>
                    <option value="monthly">Mensile</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Frequenza più alta = migliore protezione, ma consuma più crediti
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAsset({
                      name: '',
                      description: '',
                      tags: '',
                      monitoringFrequency: 'weekly',
                      file: null
                    })
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annulla
                </button>
                
                <button
                  onClick={handleAddAsset}
                  disabled={!newAsset.file || !newAsset.name.trim() || uploadingAsset}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
                >
                  {uploadingAsset ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Caricando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Aggiungi Asset
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedAsset.name}
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={selectedAsset.imageUrl}
                      alt={selectedAsset.name}
                      className="w-full rounded-lg"
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Statistiche Monitoraggio</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">{selectedAsset.totalViolations}</p>
                          <p className="text-sm text-gray-600">Violazioni Totali</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {selectedAsset.monitoringResults?.length || 0}
                          </p>
                          <p className="text-sm text-gray-600">Controlli Effettuati</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Informazioni Asset</h4>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm text-gray-500">Stato</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {selectedAsset.monitoringEnabled ? 'Monitoraggio Attivo' : 'In Pausa'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Frequenza</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formatFrequency(selectedAsset.monitoringFrequency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Ultimo Controllo</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {selectedAsset.lastMonitoredAt ? 
                              new Date(selectedAsset.lastMonitoredAt).toLocaleDateString('it-IT') : 
                              'Mai controllato'
                            }
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {selectedAsset.tags.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Tag</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedAsset.tags.map((tag) => (
                            <span key={tag} className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monitoring History */}
                {selectedAsset.monitoringResults && selectedAsset.monitoringResults.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 mb-4">Cronologia Monitoraggio</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 text-sm font-semibold text-gray-900">Data</th>
                            <th className="text-left py-2 text-sm font-semibold text-gray-900">Violazioni</th>
                            <th className="text-left py-2 text-sm font-semibold text-gray-900">Nuove</th>
                            <th className="text-left py-2 text-sm font-semibold text-gray-900">Risolte</th>
                            <th className="text-left py-2 text-sm font-semibold text-gray-900">Stato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAsset.monitoringResults.map((result) => (
                            <tr key={result.id} className="border-b border-gray-100">
                              <td className="py-3 text-sm text-gray-900">
                                {new Date(result.monitoringDate).toLocaleDateString('it-IT')}
                              </td>
                              <td className="py-3 text-sm font-medium text-gray-900">
                                {result.violationsFound}
                              </td>
                              <td className="py-3 text-sm text-red-600">
                                +{result.newViolations}
                              </td>
                              <td className="py-3 text-sm text-green-600">
                                -{result.resolvedViolations}
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                  result.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : result.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {result.status === 'completed' ? 'Completato' :
                                   result.status === 'failed' ? 'Fallito' : 'In corso'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}