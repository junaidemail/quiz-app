'use client'
import { useState, useEffect } from 'react'
import type { Question } from '@/lib/types'
import { isBookmarked, toggleBookmark } from '@/lib/storage'
import { getChapterLabel } from '@/lib/questions'
import { MathText } from './MathText'

interface Props {
  question: Question
  questionIndex: number
  totalQuestions: number
  onNext: () => void
  onPrev: () => void
}

export function FlashCard({ question, questionIndex, totalQuestions, onNext, onPrev }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => {
    setFlipped(false)
    setBookmarked(isBookmarked(question.id))
  }, [question.id])

  const handleBookmark = () => {
    const next = toggleBookmark(question.id)
    setBookmarked(next)
  }

  const progress = ((questionIndex + 1) / totalQuestions) * 100

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="animate-fade">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
          {questionIndex + 1} / {totalQuestions}
        </span>
        <button onClick={handleBookmark} style={{ color: bookmarked ? '#f59e0b' : 'var(--fg-muted)', fontSize: 20 }}>
          {bookmarked ? '⭐' : '☆'}
        </button>
      </div>

      <div className="progress-bar mb-5">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Badges */}
      <div className="flex gap-2 mb-4">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
          {question.subject}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs"
          style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
          {getChapterLabel(question)}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs"
          style={{ background: flipped ? '#ecfdf5' : 'var(--accent-light)', color: flipped ? '#065f46' : 'var(--accent)' }}>
          {flipped ? 'Answer' : 'Question'}
        </span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          minHeight: 260, perspective: 1000, cursor: 'pointer',
        }}>
        <div style={{
          position: 'relative', width: '100%', minHeight: 260,
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s ease',
        }}>
          {/* Front */}
          <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
            className="card flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                👆 Tap to reveal answer
              </p>
              <p className="text-base font-semibold leading-relaxed" style={{ color: 'var(--fg)' }}>
                <MathText text={question.question} />
              </p>
            </div>
          </div>

          {/* Back */}
          <div style={{
            backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            position: 'absolute', inset: 0,
          }}
            className="card p-6 flex flex-col">
            <div className="flex flex-col gap-2 flex-1">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="p-3 rounded-xl text-sm flex items-start gap-2"
                  style={{
                    background: opt === question.answer ? '#ecfdf5' : 'var(--bg)',
                    border: `2px solid ${opt === question.answer ? 'var(--success)' : 'var(--border)'}`,
                    color: opt === question.answer ? '#065f46' : 'var(--fg-muted)',
                  }}>
                  <span className="font-bold min-w-5">{opt}.</span>
                  <span><MathText text={question.options[opt]} /></span>
                  {opt === question.answer && <span className="ml-auto font-bold">✓</span>}
                </div>
              ))}
            </div>
            {question.explanation && (
              <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
                style={{ background: 'var(--accent-light)', color: 'var(--fg)' }}>
                <span className="font-semibold">💡 </span><MathText text={question.explanation.substring(0, 200)} />
                {question.explanation.length > 200 ? '...' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
        {flipped ? '✓ Tap card to flip back' : 'Tap card to see the answer'}
      </p>

      <div className="flex justify-between mt-5 gap-3">
        <button onClick={onPrev} disabled={questionIndex === 0} className="btn-secondary flex-1">
          ← Prev
        </button>
        <button onClick={() => setFlipped(false)} className="btn-secondary px-4">
          🔄
        </button>
        <button onClick={onNext} className="btn-primary flex-1">
          {questionIndex === totalQuestions - 1 ? 'Finish ✓' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
