"use client"

import { useMemo } from "react"
import { liteClient as algoliasearch } from "algoliasearch/lite"
import { InstantSearch, Configure } from "react-instantsearch"

// ============================================
// Algolia InstantSearch Provider
// ============================================

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ""
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || ""

export const ALGOLIA_ENABLED = !!(APP_ID && SEARCH_KEY)

// Stable singleton — created once outside React to avoid re-renders
const searchClient = ALGOLIA_ENABLED ? algoliasearch(APP_ID, SEARCH_KEY) : null

export { searchClient }

interface AlgoliaProviderProps {
  indexName?: string
  children: React.ReactNode
}

/**
 * Wraps children in InstantSearch context.
 * If Algolia isn't configured, renders children without the provider.
 */
export function AlgoliaProvider({ indexName = "jbc_volunteers", children }: AlgoliaProviderProps) {
  if (!searchClient) {
    return <>{children}</>
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      insights
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {children}
    </InstantSearch>
  )
}
