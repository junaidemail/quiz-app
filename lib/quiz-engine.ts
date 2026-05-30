import type { Question, QuizConfig, QuizSession, UserAnswer } from './types'
import { shuffleArray, filterQuestions } from './questions'

export function createSession(
  questions: Question[],
  config: QuizConfig,
  bookmarkedIds?: Set<string>
): QuizSession {
  let pool = filterQuestions(questions, {
    subject: config.subject,
    chapters: config.chapters.length ? config.chapters : undefined,
    onlyWithAnswers: config.mode !== 'flashcard',
    bookmarkedIds: config.difficulty === 'bookmarked' ? bookmarkedIds : undefined,
  })

  if (config.shuffleQuestions) pool = shuffleArray(pool)
  const selected = pool.slice(0, Math.min(config.questionCount, pool.length))

  const answers: UserAnswer[] = selected.map(q => ({
    questionId: q.id,
    selected: null,
    isCorrect: null,
    timeSpent: 0,
    flagged: false,
  }))

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    config,
    questions: selected,
    answers,
    startedAt: Date.now(),
    completedAt: null,
    score: null,
  }
}

export function answerQuestion(
  session: QuizSession,
  questionIndex: number,
  selectedOption: string | null,
  timeSpent: number
): QuizSession {
  const q = session.questions[questionIndex]
  const isCorrect = q.answer !== null && selectedOption === q.answer

  const answers = [...session.answers]
  answers[questionIndex] = {
    ...answers[questionIndex],
    selected: selectedOption,
    isCorrect: q.answer !== null ? isCorrect : null,
    timeSpent,
  }

  return { ...session, answers }
}

export function toggleFlag(session: QuizSession, questionIndex: number): QuizSession {
  const answers = [...session.answers]
  answers[questionIndex] = { ...answers[questionIndex], flagged: !answers[questionIndex].flagged }
  return { ...session, answers }
}

export function completeSession(session: QuizSession): QuizSession {
  const answeredWithKey = session.answers.filter(a => a.isCorrect !== null)
  const correct = answeredWithKey.filter(a => a.isCorrect).length
  const score = answeredWithKey.length > 0
    ? Math.round((correct / answeredWithKey.length) * 100)
    : 0

  return { ...session, completedAt: Date.now(), score }
}

export function getSessionProgress(session: QuizSession) {
  const total     = session.questions.length
  const answered  = session.answers.filter(a => a.selected !== null).length
  const flagged   = session.answers.filter(a => a.flagged).length
  const correct   = session.answers.filter(a => a.isCorrect === true).length
  const incorrect = session.answers.filter(a => a.isCorrect === false).length
  return { total, answered, flagged, correct, incorrect, unanswered: total - answered }
}

export function getGrade(score: number): { letter: string; label: string; color: string } {
  if (score >= 90) return { letter: 'A', label: 'Excellent',    color: 'text-green-500' }
  if (score >= 80) return { letter: 'B', label: 'Good',         color: 'text-blue-500' }
  if (score >= 70) return { letter: 'C', label: 'Satisfactory', color: 'text-yellow-500' }
  if (score >= 60) return { letter: 'D', label: 'Needs Work',   color: 'text-orange-500' }
  return { letter: 'F', label: 'Study More', color: 'text-red-500' }
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
