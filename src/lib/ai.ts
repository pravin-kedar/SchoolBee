/** AI analysis of a progress report (made on demand by the backend, then cached). */

export type AiOwner = 'parent' | 'class_teacher' | 'school_owner'

export interface AiAnalysis {
  summary: string
  strengths: { title: string; detail: string | null }[]
  growth_areas: { title: string; detail: string | null; age_note: string | null }[]
  action_items: { owner: AiOwner; action: string; why: string | null; priority: 'low' | 'medium' | 'high' }[]
  home_activities: string[]
  parent_message: string | null
  data_note: string | null
  // school only (not sent to parents)
  feedback_review?: { issue: string; suggestion: string | null }[]
  attention_level?: 'none' | 'watch' | 'discuss'
  attention_reason?: string | null
}

export interface AiResult {
  status: 'ready' | 'off' | 'upgrade' | 'empty' | 'error'
  analysis: AiAnalysis | null
  generated_at: string | null
  stale: boolean
  message: string | null
}

export const OWNER_LABEL: Record<AiOwner, string> = { parent: 'Parents', class_teacher: 'Class teacher', school_owner: 'School owner' }
