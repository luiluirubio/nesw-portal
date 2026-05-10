/**
 * Draft persistence — DynamoDB via the backend API.
 * localStorage is used only as a write-ahead buffer so the UI
 * feels instant; the cloud is the source of truth.
 */
import { api } from '@/lib/api'
import type { ListingDraft, ProposalDraft, BookingDraft, BillingDraft } from '@/types/draft'

export type AnyDraft = ListingDraft | ProposalDraft | BookingDraft | BillingDraft

const LS_KEY = 'nesw_draft_wab'   // write-ahead buffer

// ── Write-ahead buffer helpers ────────────────────────────────────────────────
function wabGet(): Record<string, AnyDraft> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}
function wabSet(drafts: Record<string, AnyDraft>) {
  localStorage.setItem(LS_KEY, JSON.stringify(drafts))
}
function wabPut(d: AnyDraft) {
  const all = wabGet(); all[d.id] = d; wabSet(all)
}
function wabDel(id: string) {
  const all = wabGet(); delete all[id]; wabSet(all)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Save (create or update) a draft. Writes locally first, then syncs to cloud. */
export async function saveDraftCloud(draft: AnyDraft): Promise<void> {
  wabPut(draft)
  try { await api.saveDraft(draft) } catch { /* stays in WAB; retried next save */ }
}

/** List all drafts of a given type — cloud first, fall back to buffer. */
export async function fetchDrafts(type?: AnyDraft['draftType']): Promise<AnyDraft[]> {
  try {
    const cloud = await api.getDrafts() as AnyDraft[]
    const map: Record<string, AnyDraft> = {}
    cloud.forEach(d => { map[d.id] = d })
    wabSet(map)
    return type ? cloud.filter(d => (d as { draftType?: string }).draftType === type) : cloud
  } catch {
    const all = Object.values(wabGet()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
    return type ? all.filter(d => (d as { draftType?: string }).draftType === type) : all
  }
}

/** Get one draft by ID — cloud first, fall back to buffer. */
export async function fetchDraft<T extends AnyDraft>(id: string): Promise<T | null> {
  try { return await api.getDraft(id) as T }
  catch { return (wabGet()[id] as T) ?? null }
}

/** Delete a draft (on submit or discard). */
export async function deleteDraftCloud(id: string): Promise<void> {
  wabDel(id)
  try { await api.deleteDraft(id) } catch { /* best effort */ }
}

/** Stable ID generators — type-specific prefixes avoid collisions. */
export function generateDraftId():        string { return 'DRAFT-'    + Math.random().toString(36).slice(2, 9).toUpperCase() }
export function generateProposalDraftId():string { return 'QDRAFT-'   + Math.random().toString(36).slice(2, 9).toUpperCase() }
export function generateBookingDraftId(): string { return 'BKGDRAFT-' + Math.random().toString(36).slice(2, 9).toUpperCase() }
export function generateBillingDraftId(): string { return 'BILLDRAFT-'+ Math.random().toString(36).slice(2, 9).toUpperCase() }
