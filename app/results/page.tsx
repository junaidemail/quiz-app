'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getSessions } from '@/lib/storage'
import { getGrade, formatTime } from '@/lib/quiz-engine'
import { MathText } from '@/components/MathText'
import type { QuizSession } from '@/lib/types'
import { CheckCircle2, XCircle, SkipForward, Clock, FileText, RefreshCw, Home, BookOpen, Loader2 } from 'lucide-react'

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
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Loading results...</p>
        </div>
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
  const ringColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade">
        {/* Score header */}
        <div className="card p-8 text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="70" cy="70" r="54" fill="none" stroke={ringColor}
                  strokeWidth="10" strokeDasharray={circumference}
                  strokeDashoffset={dashOffset} strokeLinecap="square"
                  style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="text-3xl font-bold" style={{ color: ringColor }}>{score}%</span>
                <span className="text-xl font-bold uppercase tracking-wider text-[var(--fg-muted)]">{grade.letter}</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-light mb-1" style={{ color: 'var(--fg)' }}>
            Exam <span className="font-semibold">{grade.label}</span>
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
            {session.config.subject === 'all' ? 'All Subjects' : session.config.subject}
            {' · '}{session.config.mode} mode · {totalTime}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <ResultStat icon={CheckCircle2} label="Correct" value={correct} color="var(--success)" />
          <ResultStat icon={XCircle} label="Incorrect" value={incorrect} color="var(--danger)" />
          <ResultStat icon={SkipForward} label="Skipped" value={skipped} color="var(--warning)" />
          <ResultStat icon={Clock} label="Avg Time" value={avgTime} color="var(--accent)" />
        </div>

        {/* Chapter breakdown */}
        {Object.keys(chapterMap).length > 1 && (
          <div className="card p-4 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fg-muted)' }}>
              Chapter Breakdown
            </h2>
            <div className="flex flex-col gap-3">
              {Object.entries(chapterMap)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([ch, data]) => {
                  const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0
                  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
                  return (
                    <div key={ch}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate pr-4" style={{ color: 'var(--fg)', maxWidth: '70%' }}>{ch}</span>
                        <span className="font-semibold font-mono" style={{ color }}>{data.correct}/{data.total} ({pct.toFixed(0)}%)</span>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/review?id=${session.id}`} className="btn-primary text-xs py-3 gap-2 flex-1">
            <FileText className="w-4 h-4" /> Review Answers
          </Link>
          <Link href="/quiz" className="btn-secondary text-xs py-3 gap-2 flex-1">
            <RefreshCw className="w-4 h-4" /> New Quiz
          </Link>
          <Link href="/" className="btn-secondary text-xs py-3 gap-2 flex-1">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>

        {/* Wrong answers quick review */}
        {incorrect > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--fg-muted)' }}>
              Questions to Review ({incorrect} incorrect)
            </h2>
            <div className="flex flex-col gap-3">
              {session.questions.map((q, i) => {
                const a = session.answers[i]
                if (a.isCorrect !== false) return null
                return (
                  <div key={q.id} className="card p-4 animate-fade"
                    style={{ borderLeft: '3px solid var(--danger)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--fg)' }}>
                      Q{i + 1}. <MathText text={q.question} />
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-mono">
                      <span style={{ color: 'var(--danger-fg)' }} className="px-2 py-1 bg-[var(--danger-bg)]">
                        Your answer: ({a.selected}) {a.selected ? <MathText text={q.options[a.selected as keyof typeof q.options]} /> : '—'}
                      </span>
                      <span style={{ color: 'var(--success-fg)' }} className="px-2 py-1 bg-[var(--success-bg)]">
                        Correct: ({q.answer}) {q.answer ? <MathText text={q.options[q.answer as keyof typeof q.options]} /> : '—'}
                      </span>
                    </div>
                    {q.explanation && (
                      <div className="p-3 text-xs leading-relaxed flex gap-2 border mt-3"
                        style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
                        <BookOpen className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <div>
                          <span className="font-semibold">Explanation: </span>
                          <MathText text={q.explanation.substring(0, 200)} />{q.explanation.length > 200 ? '...' : ''}
                        </div>
                      </div>
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

function ResultStat({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; color?: string }>; label: string; value: string | number; color: string
}) {
  return (
    <div className="card p-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 mb-1.5" color={color} />
      <div className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}

export default function ResultsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    }>
      <ResultsPage />
    </Suspense>
  )
}
