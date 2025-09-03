export interface PlanLimits {
  searches: number
  providers: string[]
  maxResults: number
  timeoutMs: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    searches: 3,
    providers: ['proprietary'],
    maxResults: 10,
    timeoutMs: 15000
  },
  basic: {
    searches: 10,
    providers: ['proprietary', 'google_vision'],
    maxResults: 20,
    timeoutMs: 30000
  },
  pro: {
    searches: 999,
    providers: ['proprietary', 'google_vision', 'yandex', 'bing'],
    maxResults: 50,
    timeoutMs: 60000
  }
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

export function shouldResetSearches(searchesResetAt: Date): boolean {
  const now = new Date()
  const resetDate = new Date(searchesResetAt)
  
  // Reset monthly: if more than 30 days have passed
  const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceReset >= 30
}

export function hasSearchesRemaining(currentSearches: number, plan: string, searchesResetAt: Date, customLimit?: number | null): boolean {
  // If reset is needed, user effectively has 0 searches used
  const effectiveSearches = shouldResetSearches(searchesResetAt) ? 0 : currentSearches
  const maxSearches = customLimit ?? getPlanLimits(plan).searches
  return effectiveSearches < maxSearches
}

export function getRemainingSearches(currentSearches: number, plan: string, searchesResetAt: Date, customLimit?: number | null): number {
  // If reset is needed, user gets full allowance
  const effectiveSearches = shouldResetSearches(searchesResetAt) ? 0 : currentSearches
  const maxSearches = customLimit ?? getPlanLimits(plan).searches
  return Math.max(0, maxSearches - effectiveSearches)
}

export function getUserMaxSearches(plan: string, customLimit?: number | null): number {
  return customLimit ?? getPlanLimits(plan).searches
}