"use client"

import { createContext, useContext } from 'react'
import type { Course, Homework, Exam, Grade, Subject } from '@/types'
import { useSyncedCollection } from '@/hooks/useSyncedCollection'
import {
  homeworkToRow, rowToHomework, examToRow, rowToExam,
  subjectToRow, rowToSubject, courseToRow, rowToCourse, gradeToRow, rowToGrade,
} from '@/lib/supabase/mappers'

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
  // Toutes les collections École synchronisées cloud (migrations 0001 + 0007).
  const [devoirs,  setDevoirs]  = useSyncedCollection<Homework>({
    storageKey: 'pos_devoirs', table: 'devoirs', toRow: homeworkToRow, fromRow: rowToHomework,
    getId: h => h.id, defaultValue: [], orderBy: { column: 'due_date' },
  })
  const [examens,  setExamens]  = useSyncedCollection<Exam>({
    storageKey: 'pos_examens', table: 'exams', toRow: examToRow, fromRow: rowToExam,
    getId: e => e.id, defaultValue: [], orderBy: { column: 'exam_date' },
  })
  const [courses,  setCourses]  = useSyncedCollection<Course>({
    storageKey: 'pos_courses', table: 'courses', toRow: courseToRow, fromRow: rowToCourse,
    getId: c => c.id, defaultValue: [],
  })
  const [subjects, setSubjects] = useSyncedCollection<Subject>({
    storageKey: 'pos_subjects', table: 'subjects', toRow: subjectToRow, fromRow: rowToSubject,
    getId: s => s.id, defaultValue: [], orderBy: { column: 'position' },
  })
  // Debounce plus long que subjects (défaut 2500ms) : les notes référencent une
  // matière (FK NOT NULL) — pousser après laisse le temps à la matière d'exister
  // côté serveur en usage normal (voir commentaire détaillé dans mappers.ts).
  const [notes,    setNotes]    = useSyncedCollection<Grade>({
    storageKey: 'pos_notes', table: 'grades', toRow: gradeToRow, fromRow: rowToGrade,
    getId: n => n.id, defaultValue: [], debounceMs: 4000,
  })

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
