import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { AppShell } from '../components/app/AppShell'
import { CreateSchool } from '../components/app/CreateSchool'
import { UpcomingEvents } from '../components/dashboard/UpcomingEvents'
import {
  AttendanceCard,
  DashboardSkeleton,
  GreetingBanner,
  NoticesCard,
  OverviewCard,
  QuickActions,
  RecentDocuments,
  RecentStudents,
  StatCards,
  StudentsByClass,
} from '../components/dashboard/Widgets'
import { errorMessage } from '../lib/api'
import { logout, useMe } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { fetchDashboard, type Dashboard } from '../lib/dashboard'

type Load = { status: 'loading' } | { status: 'ready'; data: Dashboard } | { status: 'no-school' } | { status: 'error'; message: string }

export function DashboardPage() {
  const navigate = useNavigate()
  const token = useAccessToken()
  const { me } = useMe()
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  // Refetches when the session changes (e.g. after creating a school).
  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchDashboard()
      .then((data) => !cancelled && setLoad({ status: 'ready', data }))
      .catch((err) => {
        if (cancelled) return
        if (axios.isAxiosError(err) && err.response?.status === 409) setLoad({ status: 'no-school' })
        else setLoad({ status: 'error', message: errorMessage(err) })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) return <Navigate to="/login" replace />

  if (load.status === 'no-school') {
    return (
      <CreateSchool
        name={me?.full_name ?? ''}
        onLogout={() => {
          void logout()
          navigate('/login', { replace: true })
        }}
      />
    )
  }
  // A brand-new school goes straight into onboarding.
  if (load.status === 'ready' && load.data.school.setup_percent === 0) return <Navigate to="/setup" replace />

  const data = load.status === 'ready' ? load.data : null
  return (
    <AppShell academicYear={data?.school.academic_year} notices={data?.notices}>
      {load.status === 'loading' && <DashboardSkeleton />}
      {load.status === 'error' && (
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <p className="font-semibold text-ink">{load.message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      )}
      {data && (
        <div className="space-y-5 p-4 sm:p-6">
          <GreetingBanner data={data} />
          <StatCards data={data} />
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="grid gap-5 md:grid-cols-2 xl:col-span-2">
              <QuickActions className="md:col-span-2" />
              <AttendanceCard data={data} />
              <StudentsByClass data={data} />
              <RecentStudents data={data} />
              <RecentDocuments data={data} />
            </div>
            <div className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
              <UpcomingEvents />
              <OverviewCard data={data} />
              <NoticesCard data={data} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
