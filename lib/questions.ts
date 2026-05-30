import type { Question, Subject } from './types'

let _questions: Question[] | null = null

export async function loadQuestions(): Promise<Question[]> {
  if (_questions) return _questions
  const res = await fetch('/data/questions.json')
  _questions = await res.json()
  return _questions!
}

export function getSubjects(questions: Question[]): Subject[] {
  return [...new Set(questions.map(q => q.subject))] as Subject[]
}

export function getSources(questions: Question[], subject?: string): string[] {
  const filtered = subject && subject !== 'all'
    ? questions.filter(q => q.subject === subject)
    : questions
  return [...new Set(filtered.map(q => q.source))]
}

export function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    'PENG_MCQ_Chapters_1-3': 'Chapters 1–3 (Units, Electricity, Mechanics)',
    'PENG_MCQ_Chapters_4-6': 'Chapters 4–6 (DC Generators, Motors, Efficiency)',
    'PENG_MCQ_Chapters_7-15': 'Chapters 7–15 (Induction Motors, Transformers)',
    'PENG_MCQ_Chapters_16-30': 'Chapters 16–30 (Synchronous Machines, Drives)',
    'Power_Electronics_MCQ_With_Answers': 'Ch 1–3 (Semiconductors, Converters, Inverters)',
    'Power_Electronics_MCQ_Extended_Ch4-10': 'Ch 4–10 (Advanced Power Electronics)',
  }
  return map[source] ?? source.replace(/_/g, ' ')
}

export function filterQuestions(
  questions: Question[],
  opts: {
    subject?: string
    sources?: string[]
    onlyWithAnswers?: boolean
    bookmarkedIds?: Set<string>
    wrongIds?: Set<string>
  }
): Question[] {
  return questions.filter(q => {
    if (opts.subject && opts.subject !== 'all' && q.subject !== opts.subject) return false
    if (opts.sources?.length && !opts.sources.includes(q.source)) return false
    if (opts.onlyWithAnswers && !q.answer) return false
    if (opts.bookmarkedIds && !opts.bookmarkedIds.has(q.id)) return false
    if (opts.wrongIds && !opts.wrongIds.has(q.id)) return false
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

export function sampleQuestions(questions: Question[], count: number, shuffle = true): Question[] {
  const pool = shuffle ? shuffleArray(questions) : questions
  return pool.slice(0, Math.min(count, pool.length))
}

export function getChapterLabel(q: Question): string {
  if (q.chapterTitle && q.chapterTitle.length < 60) return q.chapterTitle
  if (q.chapter) return `Chapter ${q.chapter}`
  return getSourceLabel(q.source)
}
