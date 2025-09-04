'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  Settings,
  Database,
  Key,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react'

interface SystemConfig {
  searchEngine: {
    providers: {
      [key: string]: {
        enabled: boolean
        priority: number
        apiKey?: string
        rateLimit?: {
          requestsPerMinute: number
          requestsPerDay: number
        }
      }
    }
    aggregation: {
      deduplicationThreshold: number
      minimumSimilarity: number
      maxResultsPerProvider: number
      timeoutMs: number
    }
  }
  system: {
    maintenance: boolean
    debugMode: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    maxConcurrentSearches: number
  }
  plans: {
    [key: string]: {
      maxSearches: number
      price: number
      features: string[]
    }
  }
}

export default function SystemSettings() {
  const { user, userProfile, loading: authLoading, apiRequest } = useAuth()
  const router = useRouter()
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (authLoading) return
    
    if (!user || !userProfile?.isAdmin) {
      router.push('/login')
      return
    }

    fetchConfig()
    checkProviderStatus()
  }, [user, authLoading, router])

  const fetchConfig = async () => {
    try {
      const response = await apiRequest('/api/admin/system-config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkProviderStatus = async () => {
    try {
      const response = await apiRequest('/api/admin/search-stats')
      if (response.ok) {
        const data = await response.json()
        const status: Record<string, boolean> = {}
        Object.entries(data.providers).forEach(([name, info]: [string, any]) => {
          status[name] = info.isAvailable && info.isEnabled
        })
        setProviderStatus(status)
      }
    } catch (error) {
      console.error('Error checking provider status:', error)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    setSaving(true)
    try {
      const response = await apiRequest('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        // Show success message
        alert('Configurazione salvata con successo!')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Errore nel salvare la configurazione')
    } finally {
      setSaving(false)
    }
  }

  const testProvider = async (providerName: string) => {
    setTesting(providerName)
    try {
      const response = await apiRequest(`/api/admin/test-provider/${providerName}`, {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`Test ${providerName} completato con successo!`)
        setProviderStatus(prev => ({ ...prev, [providerName]: true }))
      } else {
        alert(`Test ${providerName} fallito: ${result.error}`)
        setProviderStatus(prev => ({ ...prev, [providerName]: false }))
      }
    } catch (error) {
      console.error(`Error testing ${providerName}:`, error)
      alert(`Errore nel test di ${providerName}`)
    } finally {
      setTesting(null)
    }
  }

  const updateProviderConfig = (providerName: string, field: string, value: any) => {
    if (!config) return

    setConfig({
      ...config,
      searchEngine: {
        ...config.searchEngine,
        providers: {
          ...config.searchEngine.providers,
          [providerName]: {
            ...config.searchEngine.providers[providerName],
            [field]: value
          }
        }
      }
    })
  }

  const updateSystemConfig = (field: string, value: any) => {
    if (!config) return

    setConfig({
      ...config,
      system: {
        ...config.system,
        [field]: value
      }
    })
  }

  const updateAggregationConfig = (field: string, value: any) => {
    if (!config) return

    setConfig({
      ...config,
      searchEngine: {
        ...config.searchEngine,
        aggregation: {
          ...config.searchEngine.aggregation,
          [field]: value
        }
      }
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      {config && (
        <div className="space-y-6">
          {/* Actions Header */}
          <div className="flex justify-end items-center space-x-4">
            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center"
            >
              {showApiKeys ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showApiKeys ? 'Nascondi' : 'Mostra'} API Keys
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salva Configurazioni
            </button>
          </div>
          {/* Provider Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6">
              <Globe className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Configurazione Provider</h2>
            </div>
            
            <div className="space-y-6">
              {Object.entries(config.searchEngine.providers).map(([providerName, providerConfig]) => (
                <div key={providerName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 mr-4">{providerName}</h3>
                      <div className="flex items-center">
                        {providerStatus[providerName] ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm ${providerStatus[providerName] ? 'text-green-600' : 'text-red-600'}`}>
                          {providerStatus[providerName] ? 'Attivo' : 'Non disponibile'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => testProvider(providerName)}
                      disabled={testing === providerName}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      {testing === providerName ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Abilitato
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={providerConfig.enabled}
                          onChange={(e) => updateProviderConfig(providerName, 'enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priorità
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={providerConfig.priority}
                        onChange={(e) => updateProviderConfig(providerName, 'priority', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {providerConfig.apiKey !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKeys ? 'text' : 'password'}
                            value={providerConfig.apiKey || ''}
                            onChange={(e) => updateProviderConfig(providerName, 'apiKey', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Inserisci API Key"
                          />
                          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {providerConfig.rateLimit && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Richieste/Minuto
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={providerConfig.rateLimit.requestsPerMinute}
                          onChange={(e) => updateProviderConfig(providerName, 'rateLimit', {
                            ...providerConfig.rateLimit,
                            requestsPerMinute: parseInt(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Richieste/Giorno
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={providerConfig.rateLimit.requestsPerDay}
                          onChange={(e) => updateProviderConfig(providerName, 'rateLimit', {
                            ...providerConfig.rateLimit,
                            requestsPerDay: parseInt(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Search Aggregation Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6">
              <Database className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Aggregazione Risultati</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soglia Deduplicazione
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={config.searchEngine.aggregation.deduplicationThreshold}
                  onChange={(e) => updateAggregationConfig('deduplicationThreshold', parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Valore tra 0 e 1 (0.85 = 85%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Similarità Minima
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.searchEngine.aggregation.minimumSimilarity}
                  onChange={(e) => updateAggregationConfig('minimumSimilarity', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Percentuale (60 = 60%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Risultati per Provider
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.searchEngine.aggregation.maxResultsPerProvider}
                  onChange={(e) => updateAggregationConfig('maxResultsPerProvider', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="300000"
                  value={config.searchEngine.aggregation.timeoutMs}
                  onChange={(e) => updateAggregationConfig('timeoutMs', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Millisecondi (30000 = 30 sec)</p>
              </div>
            </div>
          </div>

          {/* System Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6">
              <Settings className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Configurazione Sistema</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalità Manutenzione
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.system.maintenance}
                    onChange={(e) => updateSystemConfig('maintenance', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debug Mode
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.system.debugMode}
                    onChange={(e) => updateSystemConfig('debugMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Livello Log
                </label>
                <select
                  value={config.system.logLevel}
                  onChange={(e) => updateSystemConfig('logLevel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Ricerche Concorrenti
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.system.maxConcurrentSearches}
                  onChange={(e) => updateSystemConfig('maxConcurrentSearches', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Plans Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6">
              <Zap className="h-6 w-6 text-yellow-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Configurazione Piani</h2>
            </div>

            <div className="space-y-6">
              {Object.entries(config.plans).map(([planName, planConfig]) => (
                <div key={planName} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">{planName}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Ricerche
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={planConfig.maxSearches}
                        onChange={(e) => setConfig({
                          ...config,
                          plans: {
                            ...config.plans,
                            [planName]: {
                              ...planConfig,
                              maxSearches: parseInt(e.target.value)
                            }
                          }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prezzo (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={planConfig.price}
                        onChange={(e) => setConfig({
                          ...config,
                          plans: {
                            ...config.plans,
                            [planName]: {
                              ...planConfig,
                              price: parseFloat(e.target.value)
                            }
                          }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Features
                      </label>
                      <textarea
                        value={planConfig.features.join('\n')}
                        onChange={(e) => setConfig({
                          ...config,
                          plans: {
                            ...config.plans,
                            [planName]: {
                              ...planConfig,
                              features: e.target.value.split('\n').filter(f => f.trim())
                            }
                          }
                        })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Una feature per riga"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}