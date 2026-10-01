import { useEffect, useState } from 'react'

import { errorMessage } from './api'
import { attendanceApi, type StudentMonth } from './attendance'

/** One student's month (Final registers). Loading is derived from which
 *  (student, month) the current result belongs to. */
export function useStudentMonth(studentId: string | null, month: string) {
  const key = studentId ? `${studentId}|${month}` : null
  const [result, setResult] = useState<{ key: string; data: StudentMonth | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!studentId || !key) return
    let live = true
    attendanceApi
      .studentMonth(studentId, month)
      .then((data) => live && setResult({ key, data, error: null }))
      .catch((err) => live && setResult({ key, data: null, error: errorMessage(err) }))
    return () => {
      live = false
    }
  }, [studentId, month, key])

  const current = result?.key === key ? result : null
  return {
    // keep showing the previous month while the next one loads
    data: key ? (current?.data ?? result?.data ?? null) : null,
    error: current?.error ?? null,
    loading: Boolean(key) && !current,
  }
}
