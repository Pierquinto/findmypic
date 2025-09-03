import { SearchProvider, SearchQuery, SearchResult, SearchEngineResult, SearchEngineConfig } from './types'
import crypto from 'crypto'

export class SearchEngine {
  private providers: Map<string, SearchProvider> = new Map()
  private config: SearchEngineConfig

  constructor(config: SearchEngineConfig) {
    this.config = config
  }

  registerProvider(name: string, provider: SearchProvider): void {
    this.providers.set(name, provider)
  }

  async search(query: SearchQuery): Promise<SearchEngineResult> {
    const startTime = Date.now()
    const enabledProviders = this.getEnabledProviders()
    const results: SearchResult[] = []
    const providersUsed: string[] = []
    const providersFailures: Array<{ provider: string; error: string }> = []

    // Verifica disponibilità dei provider
    const availableProviders = await this.checkProviderAvailability(enabledProviders)

    // Esegui ricerche in parallelo con timeout
    const searchPromises = availableProviders.map(async ([name, provider]) => {
      try {
        const timeoutPromise = new Promise<SearchResult[]>((_, reject) => {
          setTimeout(() => reject(new Error('Search timeout')), this.config.aggregation.timeoutMs)
        })

        const searchPromise = provider.search({
          ...query,
          options: {
            ...query.options,
            maxResults: this.config.aggregation.maxResultsPerProvider
          }
        })

        const providerResults = await Promise.race([searchPromise, timeoutPromise])
        providersUsed.push(name)
        return providerResults

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        providersFailures.push({ provider: name, error: errorMessage })
        console.warn(`Provider ${name} failed:`, errorMessage)
        return []
      }
    })

    const allResults = await Promise.allSettled(searchPromises)
    
    // Aggrega tutti i risultati
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    })

    // Deduplicazione e ranking
    const finalResults = this.aggregateAndRankResults(results, query)
    
    const searchTime = Date.now() - startTime

    return {
      query,
      results: finalResults,
      metadata: {
        totalResults: finalResults.length,
        searchTime,
        providersUsed,
        providersFailures
      }
    }
  }

  private getEnabledProviders(): Array<[string, SearchProvider]> {
    const enabled: Array<[string, SearchProvider]> = []
    
    for (const [name, provider] of this.providers) {
      const providerConfig = this.config.providers[name]
      if (providerConfig?.enabled) {
        enabled.push([name, provider])
      }
    }

    // Ordina per priorità
    return enabled.sort(([nameA], [nameB]) => {
      const priorityA = this.config.providers[nameA]?.priority || 0
      const priorityB = this.config.providers[nameB]?.priority || 0
      return priorityB - priorityA // Priorità più alta prima
    })
  }

  private async checkProviderAvailability(
    providers: Array<[string, SearchProvider]>
  ): Promise<Array<[string, SearchProvider]>> {
    const availabilityChecks = providers.map(async ([name, provider]) => {
      try {
        const isAvailable = await provider.isAvailable()
        return isAvailable ? [name, provider] as [string, SearchProvider] : null
      } catch {
        console.warn(`Provider ${name} availability check failed`)
        return null
      }
    })

    const results = await Promise.allSettled(availabilityChecks)
    
    return results
      .filter((result): result is PromiseFulfilledResult<[string, SearchProvider]> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  private aggregateAndRankResults(results: SearchResult[], query: SearchQuery): SearchResult[] {
    // 1. Filtra per similarità minima
    const filteredResults = results.filter(
      result => result.similarity >= this.config.aggregation.minimumSimilarity
    )

    // 2. Deduplicazione avanzata
    const deduplicatedResults = this.advancedDeduplication(filteredResults)

    // 3. Ranking intelligente
    const rankedResults = this.intelligentRanking(deduplicatedResults)

    // 4. Limita risultati finali
    return rankedResults.slice(0, query.options?.maxResults || 50)
  }

  private advancedDeduplication(results: SearchResult[]): SearchResult[] {
    const groups = new Map<string, SearchResult[]>()
    
    // Raggruppa risultati simili
    results.forEach(result => {
      const key = this.generateDeduplicationKey(result)
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(result)
    })

    // Per ogni gruppo, mantieni il risultato migliore
    const deduplicatedResults: SearchResult[] = []
    
    groups.forEach(group => {
      if (group.length === 1) {
        deduplicatedResults.push(group[0])
      } else {
        // Scegli il migliore del gruppo
        const best = group.reduce((best, current) => {
          // Priorità: violazioni > similarità > provider affidabilità
          if (current.status === 'violation' && best.status !== 'violation') return current
          if (best.status === 'violation' && current.status !== 'violation') return best
          
          if (current.similarity > best.similarity) return current
          if (best.similarity > current.similarity) return best
          
          return this.getProviderReliability(current.provider) > this.getProviderReliability(best.provider) 
            ? current : best
        })
        
        deduplicatedResults.push(best)
      }
    })

    return deduplicatedResults
  }

  private generateDeduplicationKey(result: SearchResult): string {
    const url = this.normalizeUrl(result.url)
    const domain = result.siteName.toLowerCase()
    const similarity = Math.floor(result.similarity / 5) * 5 // Raggruppa per similarità (es. 85-89%)
    
    return crypto.createHash('md5')
      .update(`${domain}:${url}:${similarity}`)
      .digest('hex')
      .substring(0, 12)
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase()
        .replace(/\/+$/, '') // Rimuovi slash finali
        .replace(/index\.(html|php|aspx?)$/, '') // Rimuovi index files
    } catch {
      return url.toLowerCase()
    }
  }

  private intelligentRanking(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => {
      // 1. Priorità per status (violation > partial > clean)
      const statusPriority = { violation: 3, partial: 2, clean: 1 }
      const statusDiff = statusPriority[b.status] - statusPriority[a.status]
      if (statusDiff !== 0) return statusDiff

      // 2. Priorità per rischio copyright
      const riskPriority = { high: 3, medium: 2, low: 1 }
      const aRisk = a.metadata?.copyrightRisk || 'low'
      const bRisk = b.metadata?.copyrightRisk || 'low'
      const riskDiff = riskPriority[bRisk] - riskPriority[aRisk]
      if (riskDiff !== 0) return riskDiff

      // 3. Similarità
      const similarityDiff = b.similarity - a.similarity
      if (Math.abs(similarityDiff) > 1) return similarityDiff

      // 4. Affidabilità del provider
      const providerDiff = this.getProviderReliability(b.provider) - this.getProviderReliability(a.provider)
      if (providerDiff !== 0) return providerDiff

      // 5. Data di rilevamento (più recente prima)
      return b.detectedAt.getTime() - a.detectedAt.getTime()
    })
  }

  private getProviderReliability(providerName: string): number {
    // Punteggio di affidabilità per provider
    const reliability: Record<string, number> = {
      'FindMyPic Proprietary Scanner': 10, // Massima affidabilità per il nostro sistema
      'TinEye API': 9, // Molto preciso per match esatti
      'Google Vision API': 8, // Buona copertura globale
      'Yandex Images': 7, // Buono per contenuti russi/est europei
      'Bing Visual Search': 6, // Discreto
    }
    
    return reliability[providerName] || 5
  }

  // Utility methods
  async getProviderStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}
    
    for (const [name, provider] of this.providers) {
      stats[name] = {
        isEnabled: this.config.providers[name]?.enabled || false,
        rateLimit: provider.getRateLimit(),
        metadata: provider.getMetadata(),
        isAvailable: await provider.isAvailable().catch(() => false)
      }
    }
    
    return stats
  }

  updateConfig(newConfig: Partial<SearchEngineConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): SearchEngineConfig {
    return { ...this.config }
  }
}