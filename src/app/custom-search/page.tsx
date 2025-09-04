'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/client';
import { Shield, Clock, Search, AlertTriangle, Info, CheckCircle } from 'lucide-react'

export default function CustomSearchPage() {
  const { user, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name: '',
    requestType: 'manual_search',
    description: '',
    urgencyLevel: 'normal',
    targetSites: '',
    additionalInfo: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)

  const requestTypes = {
    manual_search: {
      name: 'Ricerca Manuale',
      description: 'Ricerca manuale approfondita da parte di esperti umani',
      price: '€29.99',
      timeframe: '5-7 giorni'
    },
    deep_analysis: {
      name: 'Analisi Approfondita',
      description: 'Analisi completa con report dettagliato e raccomandazioni',
      price: '€49.99',
      timeframe: '3-5 giorni'
    },
    custom_sites: {
      name: 'Siti Personalizzati',
      description: 'Monitoraggio di siti specifici definiti da te',
      price: '€79.99',
      timeframe: '2-3 giorni'
    }
  }

  const urgencyLevels = {
    low: { name: 'Bassa', boost: '', timeframe: '+2-3 giorni' },
    normal: { name: 'Normale', boost: '', timeframe: 'Standard' },
    high: { name: 'Alta', boost: '+€15', timeframe: '-1-2 giorni' },
    urgent: { name: 'Urgente', boost: '+€35', timeframe: '24-48 ore' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/custom-search-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetSites: formData.targetSites.split('\n').filter(s => s.trim()),
          additionalInfo: { notes: formData.additionalInfo }
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        setSubmitted(true)
      } else {
        alert('Errore: ' + (data.error || 'Richiesta fallita'))
      }
    } catch (error) {
      alert('Errore di connessione')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Richiesta Inviata!
              </h1>
              <p className="text-gray-600">
                La tua richiesta personalizzata è stata ricevuta e sarà processata al più presto.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Dettagli della Richiesta</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">ID Richiesta:</span>
                  <p className="font-mono text-sm">{result.requestId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Costo Stimato:</span>
                  <p className="font-semibold">€{result.estimatedCost}</p>
                </div>
                <div>
                  <span className="text-gray-600">Priorità:</span>
                  <p>{result.priority}</p>
                </div>
                <div>
                  <span className="text-gray-600">Tempo Stimato:</span>
                  <p>{result.expectedResponse}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Prossimi Passi</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Riceverai una conferma via email entro 24 ore</li>
                <li>• Il nostro team analizzerà la tua richiesta</li>
                <li>• Ti contatteremo per eventuali chiarimenti</li>
                <li>• Procederemo con l'analisi personalizzata</li>
              </ul>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Torna alla Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ricerca Personalizzata
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Richiedi un'analisi manuale approfondita da parte dei nostri esperti per casi complessi
          </p>
          <div className="mt-4 inline-block bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm">
            🚀 Coming Soon - Attualmente in fase beta
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Info Panel */}
          <div className="bg-purple-50 p-6 border-b">
            <div className="flex items-start space-x-4">
              <Info className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Come Funziona il Servizio</h3>
                <p className="text-purple-800 text-sm leading-relaxed">
                  Il nostro servizio utilizza <strong>ricerca inversa automatica</strong> su provider terzi specializzati 
                  e monitora siti noti per la pubblicazione di leak e immagini senza consenso. Tutti i dati vengono 
                  <strong> crittografati nel nostro database</strong> e rimossi automaticamente dopo 
                  <strong> 6 mesi</strong> (utenti free) o su richiesta (utenti premium).
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Informazioni di Contatto */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Informazioni di Contatto</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Tipo di Richiesta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Tipo di Servizio *
                  </label>
                  <div className="space-y-3">
                    {Object.entries(requestTypes).map(([key, type]) => (
                      <div key={key} className="relative">
                        <input
                          type="radio"
                          id={key}
                          name="requestType"
                          value={key}
                          checked={formData.requestType === key}
                          onChange={(e) => setFormData({...formData, requestType: e.target.value})}
                          className="sr-only"
                        />
                        <label 
                          htmlFor={key}
                          className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                            formData.requestType === key 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{type.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="font-bold text-purple-600">{type.price}</div>
                              <div className="text-xs text-gray-500">{type.timeframe}</div>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dettagli della Richiesta */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Dettagli della Richiesta</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrizione della Richiesta *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrivi in dettaglio cosa stai cercando, il tipo di contenuti, le circostanze..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Minimo 10 caratteri
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Siti Specifici da Monitorare (opzionale)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.targetSites}
                    onChange={(e) => setFormData({...formData, targetSites: e.target.value})}
                    placeholder="example.com&#10;another-site.com&#10;forum.example.org"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Un sito per riga
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Livello di Urgenza *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(urgencyLevels).map(([key, level]) => (
                      <div key={key} className="relative">
                        <input
                          type="radio"
                          id={`urgency-${key}`}
                          name="urgencyLevel"
                          value={key}
                          checked={formData.urgencyLevel === key}
                          onChange={(e) => setFormData({...formData, urgencyLevel: e.target.value})}
                          className="sr-only"
                        />
                        <label 
                          htmlFor={`urgency-${key}`}
                          className={`block p-3 text-center border rounded-lg cursor-pointer transition-colors ${
                            formData.urgencyLevel === key 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-semibold">{level.name}</div>
                          <div className="text-xs text-gray-600">{level.timeframe}</div>
                          {level.boost && (
                            <div className="text-xs text-purple-600 font-medium">{level.boost}</div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Informazioni Aggiuntive
                  </label>
                  <textarea
                    rows={3}
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}
                    placeholder="Qualsiasi altra informazione che potrebbe essere utile per la ricerca..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Informazioni Importanti</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Privacy:</strong> Tutte le richieste vengono crittografate nel nostro database</li>
                    <li>• <strong>Ritenzione dati:</strong> I dati vengono eliminati dopo 12 mesi per elaborazione</li>
                    <li>• <strong>Costi:</strong> I prezzi mostrati sono stimati e potrebbero variare</li>
                    <li>• <strong>Tempi:</strong> Riceverai conferma via email entro 24 ore</li>
                    <li>• <strong>Beta:</strong> Il servizio è in fase di test, alcune funzionalità potrebbero cambiare</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    <span>Invio in corso...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Invia Richiesta</span>
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Nessun pagamento richiesto ora. Ti contatteremo per i dettagli.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}