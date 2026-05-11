"use client"

import { createContext, useContext } from 'react'
import type { Course, Homework, Exam, Grade, Subject } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'

interface EducationContextValue {
  courses: Course[]
  setCourses: (v: Course[] | ((prev: Course[]) => Course[])) => void
  devoirs: Homework[]
  setDevoirs: (v: Homework[] | ((prev: Homework[]) => Homework[])) => void
  examens: Exam[]
  setExamens: (v: Exam[] | ((prev: Exam[]) => Exam[])) => void
  notes: Grade[]
  setNotes: (v: Grade[] | ((prev: Grade[]) => Grade[])) => void
  subjects: Subject[]
  setSubjects: (v: Subject[] | ((prev: Subject[]) => Subject[])) => void
}

const EducationContext = createContext<EducationContextValue | null>(null)

export function EducationProvider({ children }: { children: React.ReactNode }) {
  const [courses,  setCourses]  = useLS<Course[]>('pos_courses',   [])
  const [devoirs,  setDevoirs]  = useLS<Homework[]>('pos_devoirs',  [])
  const [examens,  setExamens]  = useLS<Exam[]>('pos_examens',     [])
  const [notes,    setNotes]    = useLS<Grade[]>('pos_notes',      [])
  const [subjects, setSubjects] = useLS<Subject[]>('pos_subjects', [])

  return (
    <EducationContext.Provider value={{ courses, setCourses, devoirs, setDevoirs, examens, setExamens, notes, setNotes, subjects, setSubjects }}>
      {children}
    </EducationContext.Provider>
  )
}

export function useEducationContext(): EducationContextValue {
  const ctx = useContext(EducationContext)
  if (!ctx) throw new Error('useEducationContext doit être utilisé dans <EducationProvider>')
  return ctx
}
