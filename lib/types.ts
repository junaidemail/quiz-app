export type Subject = 'PENG' | 'Power Electronics'
export type QuizMode = 'practice' | 'exam' | 'flashcard'
export type Difficulty = 'all' | 'unanswered' | 'wrong' | 'bookmarked'

export interface Question {
  id: string
  question: string
  options: { A: string; B: string; C: string; D: string }
  answer: string | null
  explanation: string | null
  subject: Subject
  chapter: number | null
  chapterTitle: string | null
  source: string
}

export interface QuizConfig {
  subject: Subject | 'all'
  sources: string[]
  questionCount: number
  mode: QuizMode
  timePerQuestion: number  // seconds, 0 = unlimited
  difficulty: Difficulty
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

export interface UserAnswer {
  questionId: string
  selected: string | null
  isCorrect: boolean | null
  timeSpent: number
  flagged: boolean
}

export interface QuizSession {
  id: string
  config: QuizConfig
  questions: Question[]
  answers: UserAnswer[]
  startedAt: number
  completedAt: number | null
  score: number | null
}

export interface QuizStats {
  totalQuizzes: number
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  bestScore: number
  totalTimeSpent: number
  streak: number
  lastStudied: number | null
  subjectAccuracy: Record<string, { correct: number; total: number }>
  chapterAccuracy: Record<string, { correct: number; total: number }>
}

export interface AppState {
  bookmarks: Set<string>
  history: QuizSession[]
  stats: QuizStats
  darkMode: boolean
  soundEnabled: boolean
}
