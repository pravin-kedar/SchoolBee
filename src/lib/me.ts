import { api } from './api'
import { refreshMe } from './auth'

export type StartPage = 'dashboard' | 'attendance'

export interface MyProfile {
  user_id: string
  full_name: string
  email: string | null
  mobile: string | null
  username: string | null
  role: string
  status: string
  member_since: string
  photo_url: string | null
  assigned_sections: string[]
  has_password: boolean
  email_notifications: boolean
  start_page: StartPage
}

export interface ProfileInput {
  full_name: string
  username: string | null
  email: string
  mobile: string | null
}

/** Name/photo also show in the top bar, which reads the cached /auth/me -
 *  refresh it after every change. */
const changed = (p: Promise<{ data: MyProfile }>) =>
  p.then((r) => {
    refreshMe()
    return r.data
  })

export const meApi = {
  profile: () => api.get<MyProfile>('/me/profile').then((r) => r.data),
  update: (body: ProfileInput) => changed(api.patch('/me/profile', body)),
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return changed(api.post('/me/photo', form))
  },
  removePhoto: () => changed(api.delete('/me/photo')),
  changePassword: (current_password: string | null, new_password: string) =>
    api.post('/me/password', { current_password, new_password }).then(() => undefined),
  preferences: (body: { email_notifications?: boolean; start_page?: StartPage }) => changed(api.patch('/me/preferences', body)),
}

/** Where login lands, from the user's preference. */
export const startPath = (start: string | undefined) => (start === 'attendance' ? '/attendance/take' : '/dashboard')
