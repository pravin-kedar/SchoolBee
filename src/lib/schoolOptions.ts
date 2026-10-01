import { useEffect, useState } from 'react'

import { setupApi, type AcademicYear, type SchoolClass } from './setup'

export interface SchoolOptions {
  classes: SchoolClass[]
  years: AcademicYear[]
  activeYear: AcademicYear | null
}

// Classes/sections/years change rarely - fetch once per page load, shared by
// every student screen (filters, enrollment form).
let cache: Promise<SchoolOptions> | null = null

export function loadSchoolOptions(force = false): Promise<SchoolOptions> {
  if (!cache || force) {
    cache = setupApi
      .get()
      .then((s) => ({
        classes: s.classes,
        years: s.academic_years,
        activeYear: s.academic_years.find((y) => y.is_active) ?? null,
      }))
      .catch((err) => {
        cache = null
        throw err
      })
  }
  return cache
}

export function useSchoolOptions() {
  const [options, setOptions] = useState<SchoolOptions | null>(null)
  useEffect(() => {
    let live = true
    loadSchoolOptions().then((o) => live && setOptions(o), () => live && setOptions({ classes: [], years: [], activeYear: null }))
    return () => {
      live = false
    }
  }, [])
  return options
}
