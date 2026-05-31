'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getSessions } from '@/lib/storage'
import { getGrade, formatTime } from '@/lib/quiz-engine'
import { MathText } from '@/components/MathText'
import type { QuizSession } from '@/lib/types'

function ResultsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('id')
  const [session, setSession] = useState<QuizSession | null>(null)

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }
    const s = getSessions().find(s => s.id === sessionId)
    if (!s?.completedAt) { router.replace('/'); return }
    setSession(s)
  }, [sessionId, router])

  if (!session?.completedAt) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    )
  }

  const score = session.score ?? 0
  const grade = getGrade(score)
  const totalTime = formatTime(Math.round((session.completedAt - session.startedAt) / 1000))
  const correct = session.answers.filter(a => a.isCorrect === true).length
  const incorrect = session.answers.filter(a => a.isCorrect === false).length
  const skipped = session.answers.filter(a => a.selected === null).length
  const answered = session.answers.filter(a => a.selected !== null).length
  const avgTime = answered > 0
    ? formatTime(Math.round(session.answers.reduce((acc, a) => acc + a.timeSpent, 0) / answered))
    : '0s'

  // Chapter breakdown
  const chapterMap: Record<string, { correct: number; total: number }> = {}
  session.questions.forEach((q, i) => {
    const ch = q.chapterTitle && q.chapterTitle.length < 60
      ? q.chapterTitle
      : q.source.replace(/_/g, ' ')
    if (!chapterMap[ch]) chapterMap[ch] = { correct: 0, total: 0 }
    const ans = session.answers[i]
    if (ans.selected !== null && ans.isCorrect !== null) {
      chapterMap[ch].total++
      if (ans.isCorrect) chapterMap[ch].correct++
    }
  })

  const scoreRingPct = score / 100
  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - scoreRingPct)
  const ringColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade">
        {/* Score header */}
        <div className="card p-8 text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="70" cy="70" r="54" fill="none" stroke={ringColor}
                  strokeWidth="10" strokeDasharray={circumference}
                  strokeDashoffset={dashOffset} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="text-3xl font-bold" style={{ color: ringColor }}>{score}%</span>
                <span className="text-2xl font-bold" style={{ color: ringColor }}>{grade.letter}</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>
            {grade.label}!
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {session.config.subject === 'all' ? 'All Subjects' : session.config.subject}
            {' · '}{session.config.mode} mode · {totalTime}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <ResultStat icon="✅" label="Correct" value={correct} color="#10b981" />
          <ResultStat icon="❌" label="Incorrect" value={incorrect} color="#ef4444" />
          <ResultStat icon="⏭" label="Skipped" value={skipped} color="#f59e0b" />
          <ResultStat icon="⏱" label="Avg Time" value={avgTime} color="#6366f1" />
        </div>

        {/* Chapter breakdown */}
        {Object.keys(chapterMap).length > 1 && (
          <div className="card p-4 mb-6">
            <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>Chapter Breakdown</h2>
            <div className="flex flex-col gap-2">
              {Object.entries(chapterMap)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([ch, data]) => {
                  const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0
                  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={ch}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate" style={{ color: 'var(--fg)', maxWidth: '60%' }}>{ch}</span>
                        <span style={{ color }}>{data.correct}/{data.total} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/review?id=${session.id}`} className="btn-primary flex-1 text-center py-3 rounded-xl">
            Review Answers 📋
          </Link>
          <Link href="/quiz" className="btn-secondary flex-1 text-center py-3 rounded-xl">
            New Quiz 🔄
          </Link>
          <Link href="/" className="btn-secondary flex-1 text-center py-3 rounded-xl">
            Home 🏠
          </Link>
        </div>

        {/* Wrong answers quick review */}
        {incorrect > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>
              Questions to Review ({incorrect} incorrect)
            </h2>
            <div className="flex flex-col gap-3">
              {session.questions.map((q, i) => {
                const a = session.answers[i]
                if (a.isCorrect !== false) return null
                return (
                  <div key={q.id} className="card p-4 animate-fade"
                    style={{ borderLeft: '3px solid var(--danger)' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                      Q{i + 1}. <MathText text={q.question} />
                    </p>
                    <div className="flex gap-4 text-xs">
                      <span style={{ color: 'var(--danger)' }}>
                        Your answer: ({a.selected}) {a.selected ? <MathText text={q.options[a.selected as keyof typeof q.options]} /> : '—'}
                      </span>
                      <span style={{ color: 'var(--success)' }}>
                        Correct: ({q.answer}) {q.answer ? <MathText text={q.options[q.answer as keyof typeof q.options]} /> : '—'}
                      </span>
                    </div>
                    {q.explanation && (
                      <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                        💡 <MathText text={q.explanation.substring(0, 200)} />{q.explanation.length > 200 ? '...' : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function ResultStat({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color: string
}) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}

export default function ResultsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-4xl animate-pulse">⚡</div></div>}>
      <ResultsPage />
    </Suspense>
  )
}
