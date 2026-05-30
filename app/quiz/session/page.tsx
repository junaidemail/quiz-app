'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QuestionCard } from '@/components/QuestionCard'
import { QuestionNavigator } from '@/components/QuestionNavigator'
import { FlashCard } from '@/components/FlashCard'
import { getSessions, saveSession, updateStatsFromSession } from '@/lib/storage'
import { answerQuestion, toggleFlag, completeSession, getSessionProgress } from '@/lib/quiz-engine'
import type { QuizSession } from '@/lib/types'

function SessionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('id')

  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [showNav, setShowNav] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!sessionId) { router.replace('/quiz'); return }
    const sessions = getSessions()
    const s = sessions.find(s => s.id === sessionId)
    if (!s) { router.replace('/quiz'); return }
    setSession(s)
    if (s.completedAt) {
      router.replace(`/results?id=${s.id}`)
    }
  }, [sessionId, router])

  // Timer per question
  useEffect(() => {
    if (!session) return
    const tpq = session.config.timePerQuestion
    if (!tpq || session.config.mode === 'practice') return

    setTimeLeft(tpq)
    setQuestionStartTime(Date.now())
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === undefined) return undefined
        if (prev <= 1) {
          clearInterval(interval)
          // Auto-advance on timeout
          handleNext(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, session?.id])

  const handleAnswer = useCallback((option: string) => {
    if (!session) return
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    const updated = answerQuestion(session, currentIdx, option, timeSpent)
    setSession(updated)
    saveSession(updated)
  }, [session, currentIdx, questionStartTime])

  const handleFlag = useCallback(() => {
    if (!session) return
    const updated = toggleFlag(session, currentIdx)
    setSession(updated)
    saveSession(updated)
  }, [session, currentIdx])

  const handleNext = useCallback((timeout = false) => {
    if (!session) return
    const isLast = currentIdx === session.questions.length - 1

    if (isLast) {
      if (session.config.mode === 'flashcard') {
        // Flashcard mode: just go back to home, no scoring
        router.push('/?flashcard=done')
        return
      }
      const completed = completeSession(session)
      saveSession(completed)
      updateStatsFromSession(completed)
      router.push(`/results?id=${completed.id}`)
      return
    }

    if (timeout) {
      // timeout on non-last: skip to next
      setCurrentIdx(i => i + 1)
      setQuestionStartTime(Date.now())
    } else {
      setCurrentIdx(i => i + 1)
      setQuestionStartTime(Date.now())
    }
  }, [session, currentIdx, router])

  const handlePrev = useCallback(() => {
    setCurrentIdx(i => Math.max(0, i - 1))
    setQuestionStartTime(Date.now())
  }, [])

  const handleJump = useCallback((idx: number) => {
    setCurrentIdx(idx)
    setQuestionStartTime(Date.now())
    setShowNav(false)
  }, [])

  const handleFinish = () => {
    if (!session) return
    if (session.config.mode === 'flashcard') {
      router.push('/')
      return
    }
    const completed = completeSession(session)
    saveSession(completed)
    updateStatsFromSession(completed)
    router.push(`/results?id=${completed.id}`)
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⚡</div>
          <p style={{ color: 'var(--fg-muted)' }}>Loading quiz...</p>
        </div>
      </div>
    )
  }

  const progress = getSessionProgress(session)
  const q = session.questions[currentIdx]
  const ans = session.answers[currentIdx]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 px-4 py-2 flex items-center justify-between gap-4"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')}
          className="text-sm font-medium flex items-center gap-1"
          style={{ color: 'var(--fg-muted)' }}>
          ← Exit
        </button>

        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span>{progress.answered}/{progress.total} answered</span>
          {progress.flagged > 0 && <span className="text-red-400">🚩 {progress.flagged}</span>}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {session.config.mode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowNav(n => !n)}
            className="text-sm px-3 py-1 rounded-lg"
            style={{ background: showNav ? 'var(--accent)' : 'var(--accent-light)', color: showNav ? 'white' : 'var(--accent)' }}>
            Nav
          </button>
          <button onClick={handleFinish}
            className="text-sm px-3 py-1 rounded-lg font-medium"
            style={{ background: 'var(--success)', color: 'white' }}>
            Finish
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className={`flex gap-6 ${showNav ? 'flex-col lg:flex-row' : ''}`}>
          {/* Main question */}
          <div className="flex-1 min-w-0">
            {session.config.mode === 'flashcard' ? (
              <FlashCard
                question={q}
                questionIndex={currentIdx}
                totalQuestions={session.questions.length}
                onNext={() => handleNext()}
                onPrev={handlePrev}
              />
            ) : (
              <QuestionCard
                question={q}
                questionIndex={currentIdx}
                totalQuestions={session.questions.length}
                userAnswer={ans}
                mode={session.config.mode}
                shuffleOptions={session.config.shuffleOptions}
                onAnswer={handleAnswer}
                onFlag={handleFlag}
                onNext={() => handleNext()}
                onPrev={handlePrev}
                timeLeft={timeLeft}
                totalTime={session.config.timePerQuestion || undefined}
              />
            )}
          </div>

          {/* Navigator sidebar */}
          {showNav && (
            <div className="w-full lg:w-64 animate-slide">
              <QuestionNavigator
                answers={session.answers}
                currentIndex={currentIdx}
                onJump={handleJump}
                mode={session.config.mode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function QuizSessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    }>
      <SessionPage />
    </Suspense>
  )
}
