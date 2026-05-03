/**
 * Draft persistence — DynamoDB via the backend API.
 * localStorage is used only as a write-ahead buffer so the UI
 * feels instant; the cloud is the source of truth.
 */
import { api } from '@/lib/api'
import type { ListingDraft } from '@/types/draft'

const LS_KEY = 'nesw_draft_wab'   // write-ahead buffer

// ── Write-ahead buffer helpers ────────────────────────────────────────────────
function wabGet(): Record<string, ListingDraft> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}
function wabSet(drafts: Record<string, ListingDraft>) {
  localStorage.setItem(LS_KEY, JSON.stringify(drafts))
}
function wabPut(d: ListingDraft) {
  const all = wabGet(); all[d.id] = d; wabSet(all)
}
function wabDel(id: string) {
  const all = wabGet(); delete all[id]; wabSet(all)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Save (create or update) a draft. Writes locally first, then syncs to cloud. */
export async function saveDraftCloud(draft: ListingDraft): Promise<void> {
  wabPut(draft)                          // instant local write
  try {
    await api.saveDraft(draft)           // sync to DynamoDB
  } catch {
    // stays in write-ahead buffer; next save attempt will retry
  }
}

/** List all drafts for the current agent — cloud first, fall back to buffer. */
export async function fetchDrafts(): Promise<ListingDraft[]> {
  try {
    const cloud = await api.getDrafts()
    // refresh local buffer with cloud state
    const map: Record<string, ListingDraft> = {}
    cloud.forEach(d => { map[d.id] = d })
    wabSet(map)
    return cloud
  } catch {
    // offline — return whatever is in the buffer
    return Object.values(wabGet()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
  }
}

/** Get one draft by ID — cloud first, fall back to buffer. */
export async function fetchDraft(id: string): Promise<ListingDraft | null> {
  try {
    return await api.getDraft(id)
  } catch {
    return wabGet()[id] ?? null
  }
}

/** Delete a draft (submit or discard). */
export async function deleteDraftCloud(id: string): Promise<void> {
  wabDel(id)
  try { await api.deleteDraft(id) } catch { /* best effort */ }
}

/** Stable ID generator for a new draft session. */
export function generateDraftId(): string {
  return 'DRAFT-' + Math.random().toString(36).slice(2, 9).toUpperCase()
}
