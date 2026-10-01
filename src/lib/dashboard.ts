import { api } from './api'

export interface DashboardNotice {
  key: string
  level: 'info' | 'warning' | 'success'
  title: string
  detail: string
  action_path: string | null
}

export interface Dashboard {
  user_name: string
  role: string
  school: {
    id: string
    name: string
    logo_url: string | null
    academic_year: string | null
    setup_percent: number
    setup_completed: boolean
  }
  stats: {
    total_students: number
    present_today: number
    absent_today: number
    late_today: number
    attendance_taken: boolean
    pending_documents: number
    pending_assessments: number
  }
  classes: { id: string; name: string; sections: number; students: number }[]
  overview: { classes: number; sections: number; staff: number }
  recent_students: { id: string; name: string; class_name: string; section: string | null; enrolled_at: string }[]
  recent_documents: {
    id: string
    title: string
    student_name: string
    status: 'Pending' | 'Verified' | 'Rejected'
    uploaded_at: string
  }[]
  notices: DashboardNotice[]
}

/** One call for the whole page. The server sends an ETag, so the browser
 *  revalidates and gets a bodiless 304 when nothing changed. */
export const fetchDashboard = () => api.get<Dashboard>('/dashboard').then((r) => r.data)
