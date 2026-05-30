'use client'
import type { UserAnswer } from '@/lib/types'

interface Props {
  answers: UserAnswer[]
  currentIndex: number
  onJump: (index: number) => void
  mode: 'practice' | 'exam' | 'flashcard'
}

export function QuestionNavigator({ answers, currentIndex, onJump, mode }: Props) {
  const getStatus = (ans: UserAnswer, idx: number) => {
    if (idx === currentIndex) return 'current'
    if (ans.flagged) return 'flagged'
    if (ans.selected === null) return 'unanswered'
    if (mode === 'practice') {
      if (ans.isCorrect === true) return 'correct'
      if (ans.isCorrect === false) return 'incorrect'
    }
    return 'answered'
  }

  const colors: Record<string, string> = {
    current: 'var(--accent)',
    flagged: '#ef4444',
    correct: 'var(--success)',
    incorrect: '#ef4444',
    answered: '#6366f1',
    unanswered: 'var(--border)',
  }

  const textColors: Record<string, string> = {
    current: 'white',
    flagged: 'white',
    correct: 'white',
    incorrect: 'white',
    answered: 'white',
    unanswered: 'var(--fg-muted)',
  }

  return (
    <div className="card p-3">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
        Question Navigator
      </p>
      <div className="flex flex-wrap gap-1.5">
        {answers.map((ans, idx) => {
          const status = getStatus(ans, idx)
          return (
            <button
              key={idx}
              onClick={() => onJump(idx)}
              style={{
                width: 32, height: 32, borderRadius: 6, fontSize: 11,
                fontWeight: 600, border: '2px solid',
                borderColor: colors[status],
                background: status === 'unanswered' ? 'transparent' : colors[status],
                color: textColors[status],
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {idx + 1}
            </button>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {mode === 'practice' ? (
          <>
            <LegendItem color={colors.correct} label="Correct" />
            <LegendItem color={colors.incorrect} label="Wrong" />
            <LegendItem color={colors.unanswered} label="Unanswered" />
          </>
        ) : (
          <>
            <LegendItem color={colors.answered} label="Answered" />
            <LegendItem color={colors.unanswered} label="Unanswered" />
          </>
        )}
        <LegendItem color={colors.flagged} label="Flagged" />
        <LegendItem color={colors.current} label="Current" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{label}</span>
    </div>
  )
}
