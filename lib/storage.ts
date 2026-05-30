'use client'
import type { QuizSession, QuizStats, AppState } from './types'

const KEYS = {
  sessions: 'quiz_sessions',
  stats: 'quiz_stats',
  bookmarks: 'quiz_bookmarks',
  settings: 'quiz_settings',
} as const

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const defaultStats: QuizStats = {
  totalQuizzes: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  accuracy: 0,
  bestScore: 0,
  totalTimeSpent: 0,
  streak: 0,
  lastStudied: null,
  subjectAccuracy: {},
  chapterAccuracy: {},
}

export function getSessions(): QuizSession[] {
  return safeGet<QuizSession[]>(KEYS.sessions, [])
}

export function saveSession(session: QuizSession): void {
  const sessions = getSessions()
  const existing = sessions.findIndex(s => s.id === session.id)
  if (existing >= 0) sessions[existing] = session
  else sessions.unshift(session)
  // Keep last 50 sessions
  safeSet(KEYS.sessions, sessions.slice(0, 50))
}

export function getStats(): QuizStats {
  return safeGet<QuizStats>(KEYS.stats, defaultStats)
}

export function updateStatsFromSession(session: QuizSession): void {
  if (!session.completedAt || session.score === null) return
  const stats = getStats()
  const correct = session.answers.filter(a => a.isCorrect).length
  const total = session.answers.filter(a => a.selected !== null).length
  const timeSpent = (session.completedAt - session.startedAt) / 1000

  stats.totalQuizzes++
  stats.totalQuestions += total
  stats.correctAnswers += correct
  stats.accuracy = stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0
  stats.bestScore = Math.max(stats.bestScore, session.score)
  stats.totalTimeSpent += timeSpent

  const today = new Date().toDateString()
  const lastDay = stats.lastStudied ? new Date(stats.lastStudied).toDateString() : null
  if (lastDay === today) {
    // same day, no change to streak
  } else if (lastDay === new Date(Date.now() - 86400000).toDateString()) {
    stats.streak++ // yesterday
  } else {
    stats.streak = 1
  }
  stats.lastStudied = Date.now()

  // Update subject accuracy
  const subj = session.config.subject
  if (!stats.subjectAccuracy[subj]) stats.subjectAccuracy[subj] = { correct: 0, total: 0 }
  stats.subjectAccuracy[subj].correct += correct
  stats.subjectAccuracy[subj].total += total

  safeSet(KEYS.stats, stats)
}

export function getBookmarks(): string[] {
  return safeGet<string[]>(KEYS.bookmarks, [])
}

export function toggleBookmark(id: string): boolean {
  const bookmarks = getBookmarks()
  const idx = bookmarks.indexOf(id)
  if (idx >= 0) {
    bookmarks.splice(idx, 1)
    safeSet(KEYS.bookmarks, bookmarks)
    return false
  } else {
    bookmarks.push(id)
    safeSet(KEYS.bookmarks, bookmarks)
    return true
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().includes(id)
}

export function getSettings(): { darkMode: boolean; soundEnabled: boolean; fontSize: 'sm' | 'md' | 'lg' } {
  return safeGet(KEYS.settings, { darkMode: false, soundEnabled: true, fontSize: 'md' as const })
}

export function saveSettings(settings: { darkMode: boolean; soundEnabled: boolean; fontSize: 'sm' | 'md' | 'lg' }): void {
  safeSet(KEYS.settings, settings)
}

export function clearAllData(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
