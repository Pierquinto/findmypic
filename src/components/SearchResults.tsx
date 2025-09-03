'use client'

import { AlertTriangle, CheckCircle, ExternalLink, Globe, Bookmark, BookmarkCheck } from 'lucide-react'
import ThumbnailImage from './OptimizedImage'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export interface SearchResultItem {
  id: string
  url: string
  siteName: string
  title?: string
  similarity: number
  status: 'violation' | 'partial' | 'clean'
  thumbnail?: string
  provider?: string
  webPageUrl?: string
}

interface SearchResultsProps {
  results: SearchResultItem[]
  userPlan?: string
  className?: string
  searchId?: string
}

export default function SearchResults({ results, userPlan = 'free', className = '', searchId }: SearchResultsProps) {
  const { apiRequest } = useAuth()
  // Filter out results with low similarity (client-side safety check)
  const filteredResults = results.filter(result => result.similarity >= 70)
  
  // State for saved violations
  const [savedViolations, setSavedViolations] = useState<Set<string>>(new Set())
  const [savingViolations, setSavingViolations] = useState<Set<string>>(new Set())
  
  const handleSaveViolation = async (result: SearchResultItem) => {
    if (savingViolations.has(result.id)) return
    
    setSavingViolations(prev => new Set(prev).add(result.id))
    
    try {
      const response = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          searchResultId: result.id,
          title: `Violazione su ${result.siteName}`,
          siteName: result.siteName,
          imageUrl: result.url,
          webPageUrl: result.webPageUrl,
          similarity: result.similarity,
          provider: result.provider,
          thumbnail: result.thumbnail,
          status: result.status,
          priority: result.status === 'violation' ? 'high' : 'medium',
          category: result.status === 'violation' ? 'copyright' : 'general'
        })
      })
      
      if (response.ok) {
        setSavedViolations(prev => new Set(prev).add(result.id))
      } else {
        console.error('Error saving violation')
      }
    } catch (error) {
      console.error('Error saving violation:', error)
    } finally {
      setSavingViolations(prev => {
        const newSet = new Set(prev)
        newSet.delete(result.id)
        return newSet
      })
    }
  }
  
  const handleRemoveViolation = async (result: SearchResultItem) => {
    if (savingViolations.has(result.id)) return
    
    setSavingViolations(prev => new Set(prev).add(result.id))
    
    try {
      const response = await apiRequest(`/api/violations?searchResultId=${result.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSavedViolations(prev => {
          const newSet = new Set(prev)
          newSet.delete(result.id)
          return newSet
        })
      } else {
        console.error('Error removing violation')
      }
    } catch (error) {
      console.error('Error removing violation:', error)
    } finally {
      setSavingViolations(prev => {
        const newSet = new Set(prev)
        newSet.delete(result.id)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'violation': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'clean': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'violation': return 'Violazione'
      case 'partial': return 'Sospetto'
      case 'clean': return 'Pulito'
      default: return status
    }
  }

  // Estrae il dominio principale da un URL
  const getMainDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return domain.replace('www.', '')
    } catch {
      return url
    }
  }

  if (filteredResults.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna violazione trovata</h3>
        <p className="text-gray-600">La tua immagine non è stata trovata su siti web pubblici.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-800">
            <strong>Attenzione:</strong> Abbiamo trovato {filteredResults.length} possibili violazioni della tua privacy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredResults.map((result) => (
          <div 
            key={result.id} 
            className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            {/* Image Container */}
            <div className="aspect-square relative overflow-hidden bg-gray-100">
              {userPlan === 'anonymous' ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <div className="text-sm text-gray-500 font-medium">
                      {getMainDomain(result.url)}
                    </div>
                  </div>
                </div>
              ) : (
                <ThumbnailImage 
                  src={result.thumbnail || ''}
                  alt={`Match on ${result.siteName}`}
                  className="w-full h-full"
                  siteName={result.siteName}
                />
              )}
              
              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                  {getStatusText(result.status)}
                </span>
              </div>

              {/* Similarity Badge */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-semibold">
                {Math.round(result.similarity)}%
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 truncate">
                {userPlan === 'anonymous' ? getMainDomain(result.url) : (result.title || result.siteName)}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {result.provider}
                </span>
                
                {userPlan === 'anonymous' ? (
                  <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-100 rounded-lg">
                    Registrati per vedere
                  </div>
                ) : userPlan !== 'free' ? (
                  <div className="flex gap-1">
                    {/* Save/Remove Violation Button */}
                    <button
                      onClick={() => savedViolations.has(result.id) ? handleRemoveViolation(result) : handleSaveViolation(result)}
                      disabled={savingViolations.has(result.id)}
                      className={`inline-flex items-center px-2 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                        savedViolations.has(result.id)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      } ${savingViolations.has(result.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={savedViolations.has(result.id) ? 'Rimuovi dalle violazioni' : 'Salva come violazione'}
                    >
                      {savingViolations.has(result.id) ? (
                        <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                      ) : savedViolations.has(result.id) ? (
                        <BookmarkCheck className="h-3 w-3" />
                      ) : (
                        <Bookmark className="h-3 w-3" />
                      )}
                    </button>
                    
                    {/* Link Buttons */}
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                        title="Visualizza immagine"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {result.webPageUrl && (
                      <a
                        href={result.webPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        title="Visualizza pagina web"
                      >
                        <Globe className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-100 rounded-lg">
                    Premium
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}