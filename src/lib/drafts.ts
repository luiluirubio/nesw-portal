import type { ListingDraft } from '@/types/draft'

const KEY = 'nesw_listing_drafts'

export function getDrafts(): ListingDraft[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function saveDraft(draft: ListingDraft) {
  const existing = getDrafts().filter(d => d.id !== draft.id)
  localStorage.setItem(KEY, JSON.stringify([draft, ...existing]))
}

export function deleteDraft(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getDrafts().filter(d => d.id !== id)))
}

export function getDraft(id: string): ListingDraft | undefined {
  return getDrafts().find(d => d.id === id)
}

export function getDraftsByAgent(agentId: string): ListingDraft[] {
  return getDrafts().filter(d => d.agentId === agentId)
}

export function generateDraftId(): string {
  return 'DRAFT-' + Math.random().toString(36).slice(2, 9).toUpperCase()
}
