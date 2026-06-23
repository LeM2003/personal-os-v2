"use client"

import { createContext, useContext } from 'react'
import type { Course, Homework, Exam, Grade, Subject } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { useSyncedCollection } from '@/hooks/useSyncedCollection'
import { homeworkToRow, rowToHomework, examToRow, rowToExam } from '@/lib/supabase/mappers'

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
  // devoirs + examens : tables Supabase déjà existantes (schéma 0001) → sync cloud.
  // notes/subjects : pas encore de table dédiée, restent en local (Phase D, voir migration proposée).
  const [devoirs,  setDevoirs]  = useSyncedCollection<Homework>({
    storageKey: 'pos_devoirs', table: 'devoirs', toRow: homeworkToRow, fromRow: rowToHomework,
    getId: h => h.id, defaultValue: [], orderBy: { column: 'due_date' },
  })
  const [examens,  setExamens]  = useSyncedCollection<Exam>({
    storageKey: 'pos_examens', table: 'exams', toRow: examToRow, fromRow: rowToExam,
    getId: e => e.id, defaultValue: [], orderBy: { column: 'exam_date' },
  })
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
