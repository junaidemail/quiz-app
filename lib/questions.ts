import type { Question } from './types'

let _questions: Question[] | null = null

export async function loadQuestions(): Promise<Question[]> {
  if (_questions) return _questions
  const res = await fetch('/data/questions.json')
  _questions = await res.json()
  return _questions!
}


export const SUBJECT_LABELS: Record<string, string> = {
  '16-Elec-A1 Circuits':                  'Circuits (16-Elec-A1)',
  '16-Elec-A6 Power Systems and Machines':'Power Systems and Machines (16-Elec-A6)',
  '16-Elec-B8 Power Electronics and Drives': 'Power Electronics and Drives (16-Elec-B8)',
}

export interface CourseInfo {
  id: string
  code: string
  name: string
  textbook: string
  available: boolean
}

export interface GroupInfo {
  id: string
  name: string
  courses: CourseInfo[]
}

export async function loadCourses(): Promise<GroupInfo[]> {
  const res = await fetch('/data/courses.json')
  const data = await res.json()
  return data.groups as GroupInfo[]
}

export interface ChapterInfo {
  subject: string
  chapter: number | null
  chapterTitle: string
  count: number
  withAnswers: number
}

export function getSubjects(questions: Question[]): string[] {
  return [...new Set(questions.map(q => q.subject))]
}

export function getChapters(questions: Question[], subject?: string): ChapterInfo[] {
  const filtered = subject && subject !== 'all'
    ? questions.filter(q => q.subject === subject)
    : questions

  const map = new Map<string, ChapterInfo>()

  for (const q of filtered) {
    const key = `${q.subject}||${q.chapter}||${q.chapterTitle}`
    if (!map.has(key)) {
      map.set(key, {
        subject: q.subject,
        chapter: q.chapter,
        chapterTitle: q.chapterTitle ?? (q.chapter ? `Chapter ${q.chapter}` : 'General'),
        count: 0,
        withAnswers: 0,
      })
    }
    const entry = map.get(key)!
    entry.count++
    if (q.answer) entry.withAnswers++
  }

  return [...map.values()].sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject)
    return (a.chapter ?? 0) - (b.chapter ?? 0)
  })
}

export function filterQuestions(
  questions: Question[],
  opts: {
    subject?: string
    chapters?: Array<{ chapter: number | null; chapterTitle: string | null }>
    onlyWithAnswers?: boolean
    bookmarkedIds?: Set<string>
  }
): Question[] {
  return questions.filter(q => {
    if (opts.subject && opts.subject !== 'all' && q.subject !== opts.subject) return false
    if (opts.chapters?.length) {
      const match = opts.chapters.some(c =>
        c.chapter === q.chapter && c.chapterTitle === q.chapterTitle
      )
      if (!match) return false
    }
    if (opts.onlyWithAnswers && !q.answer) return false
    if (opts.bookmarkedIds && !opts.bookmarkedIds.has(q.id)) return false
    return true
  })
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getChapterLabel(q: Question): string {
  if (q.chapterTitle && q.chapterTitle.length < 80) return q.chapterTitle
  if (q.chapter) return `Chapter ${q.chapter}`
  return q.subject
}
