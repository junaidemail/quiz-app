'use client'
import type { Question, UserAnswer } from '@/lib/types'
import { getChapterLabel } from '@/lib/questions'
import { isBookmarked, toggleBookmark } from '@/lib/storage'
import { useState, useEffect } from 'react'
import { MathText } from './MathText'

interface Props {
  question: Question
  questionIndex: number
  totalQuestions: number
  userAnswer: UserAnswer
  mode: 'practice' | 'exam' | 'flashcard'
  shuffleOptions?: boolean
  onAnswer: (option: string) => void
  onFlag: () => void
  onNext: () => void
  onPrev: () => void
  timeLeft?: number
  totalTime?: number
}

const optionLabels = ['A', 'B', 'C', 'D'] as const

export function QuestionCard({
  question, questionIndex, totalQuestions, userAnswer,
  mode, shuffleOptions = false, onAnswer, onFlag, onNext, onPrev,
  timeLeft, totalTime,
}: Props) {
  const [bookmarked, setBookmarked] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [optionOrder, setOptionOrder] = useState<string[]>(['A', 'B', 'C', 'D'])

  useEffect(() => {
    setBookmarked(isBookmarked(question.id))
    setShowExplanation(false)
    if (shuffleOptions) {
      const order = ['A', 'B', 'C', 'D']
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      setOptionOrder(order)
    } else {
      setOptionOrder(['A', 'B', 'C', 'D'])
    }
  }, [question.id, shuffleOptions])

  const handleBookmark = () => {
    const next = toggleBookmark(question.id)
    setBookmarked(next)
  }

  const isAnswered = userAnswer.selected !== null
  const showFeedback = mode === 'practice' && isAnswered

  const getOptionClass = (opt: string) => {
    if (!showFeedback) {
      return userAnswer.selected === opt ? 'selected' : ''
    }
    if (opt === question.answer) return 'correct'
    if (opt === userAnswer.selected && opt !== question.answer) return 'incorrect'
    return ''
  }

  const progress = ((questionIndex + 1) / totalQuestions) * 100
  const timerPct = (timeLeft !== undefined && totalTime)
    ? (timeLeft / totalTime) * 100 : 100
  const timerColor = timerPct > 50 ? 'var(--success)' : timerPct > 25 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="animate-fade" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
          {questionIndex + 1} / {totalQuestions}
        </span>

        {/* Timer */}
        {timeLeft !== undefined && (
          <div className="flex items-center gap-2">
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={timerColor}
                  strokeWidth="3" strokeDasharray="94.2" strokeDashoffset={94.2 * (1 - timerPct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
              </svg>
              <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700, color: timerColor,
              }}>{timeLeft}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={handleBookmark}
            className="p-1.5 rounded-lg text-lg transition-colors"
            style={{ color: bookmarked ? '#f59e0b' : 'var(--fg-muted)' }}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
            {bookmarked ? '⭐' : '☆'}
          </button>
          <button onClick={onFlag}
            className="p-1.5 rounded-lg text-lg transition-colors"
            style={{ color: userAnswer.flagged ? '#ef4444' : 'var(--fg-muted)' }}
            title="Flag for review">
            {userAnswer.flagged ? '🚩' : '⚑'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-5">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Subject / Chapter badge */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
          {question.subject}
        </span>
        {question.chapterTitle && question.chapterTitle.length < 60 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
            {getChapterLabel(question)}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="card p-5 mb-4">
        <p className="text-base leading-relaxed font-medium" style={{ color: 'var(--fg)' }}>
          <MathText text={question.question} />
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {optionOrder.map((opt) => {
          const optKey = opt as keyof typeof question.options
          const optClass = getOptionClass(opt)
          return (
            <button
              key={opt}
              className={`option-btn ${optClass}`}
              disabled={isAnswered && mode !== 'practice'}
              onClick={() => !isAnswered && onAnswer(opt)}>
              <span className="inline-flex items-start gap-3">
                <span className="inline-flex items-center justify-center min-w-7 h-7 rounded-full text-sm font-bold"
                  style={{
                    background: optClass === 'correct' ? 'var(--success)' :
                      optClass === 'incorrect' ? 'var(--danger)' :
                        optClass === 'selected' ? 'var(--accent)' : 'var(--border)',
                    color: ['correct', 'incorrect', 'selected'].includes(optClass) ? 'white' : 'var(--fg-muted)',
                  }}>
                  {opt}
                </span>
                <span><MathText text={question.options[optKey]} /></span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Explanation (practice mode) */}
      {showFeedback && question.explanation && (
        <div className="mt-4 animate-fade">
          <button onClick={() => setShowExplanation(s => !s)}
            className="text-sm font-medium mb-2 flex items-center gap-1"
            style={{ color: 'var(--accent)' }}>
            {showExplanation ? '▼' : '▶'} Explanation
          </button>
          {showExplanation && (
            <div className="card p-4 animate-fade" style={{ borderColor: 'var(--success)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                <MathText text={question.explanation} />
              </p>
            </div>
          )}
        </div>
      )}

      {/* No answer key notice */}
      {showFeedback && !question.answer && (
        <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'var(--accent-light)', color: 'var(--fg-muted)' }}>
          📚 Study mode — no official answer key for this question.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 gap-3">
        <button onClick={onPrev} disabled={questionIndex === 0}
          className="btn-secondary flex items-center gap-2">
          ← Prev
        </button>
        <button onClick={onNext} className="btn-primary flex items-center gap-2">
          {questionIndex === totalQuestions - 1 ? 'Finish ✓' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
