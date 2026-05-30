'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getStats, getSessions, clearAllData } from '@/lib/storage'
import { formatTime, getGrade } from '@/lib/quiz-engine'
import type { QuizStats, QuizSession } from '@/lib/types'

export default function StatsPage() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setStats(getStats())
    setSessions(getSessions())
  }, [])

  const handleClear = () => {
    if (confirmClear) {
      clearAllData()
      setStats(getStats())
      setSessions([])
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
    }
  }

  if (!stats) return null

  const hasData = stats.totalQuizzes > 0

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Statistics</h1>
          <Link href="/" className="text-sm" style={{ color: 'var(--accent)' }}>← Home</Link>
        </div>

        {!hasData ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>No data yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              Complete a quiz to see your statistics
            </p>
            <Link href="/quiz" className="btn-primary">Start a Quiz →</Link>
          </div>
        ) : (
          <>
            {/* Overall stats */}
            <section className="mb-6">
              <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>Overall Performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon="📊" label="Total Quizzes" value={stats.totalQuizzes} />
                <StatCard icon="❓" label="Questions Answered" value={stats.totalQuestions} />
                <StatCard icon="✅" label="Correct Answers" value={stats.correctAnswers} />
                <StatCard icon="🎯" label="Overall Accuracy"
                  value={`${stats.accuracy.toFixed(1)}%`}
                  color={stats.accuracy >= 80 ? '#10b981' : stats.accuracy >= 60 ? '#f59e0b' : '#ef4444'} />
                <StatCard icon="🏆" label="Best Score"
                  value={`${stats.bestScore}%`}
                  color={stats.bestScore >= 80 ? '#10b981' : '#f59e0b'} />
                <StatCard icon="⏱" label="Total Study Time"
                  value={formatTime(Math.round(stats.totalTimeSpent))} />
              </div>
            </section>

            {/* Streak */}
            <section className="mb-6">
              <div className="card p-5 flex items-center gap-4">
                <div className="text-4xl">🔥</div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                    {stats.streak} day{stats.streak !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Current study streak
                    {stats.lastStudied && ` · Last studied: ${new Date(stats.lastStudied).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </section>

            {/* Subject breakdown */}
            {Object.keys(stats.subjectAccuracy).length > 0 && (
              <section className="mb-6">
                <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>By Subject</h2>
                <div className="card p-4 flex flex-col gap-3">
                  {Object.entries(stats.subjectAccuracy).map(([subj, data]) => {
                    const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0
                    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={subj}>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: 'var(--fg)' }}>{subj}</span>
                          <span style={{ color }}>{data.correct}/{data.total} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Session history */}
            <section className="mb-6">
              <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>
                Quiz History ({sessions.length})
              </h2>
              <div className="flex flex-col gap-3">
                {sessions.map(s => {
                  const grade = s.score !== null ? getGrade(s.score) : null
                  const duration = s.completedAt
                    ? formatTime(Math.round((s.completedAt - s.startedAt) / 1000))
                    : 'In progress'
                  return (
                    <div key={s.id} className="card p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                          {s.config.subject === 'all' ? 'All Subjects' : s.config.subject}
                          {' · '}{s.questions.length} Qs · {s.config.mode}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                          {new Date(s.startedAt).toLocaleDateString()} · {duration}
                        </p>
                      </div>
                      {s.completedAt && s.score !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: grade?.color.replace('text-', '#').replace('-500', '') ?? '#888' }}>
                            {s.score}%
                          </span>
                          <Link href={`/results?id=${s.id}`}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            View
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Clear data */}
            <section className="mb-6">
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Clear All Data</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Delete all quiz history and statistics
                  </p>
                </div>
                <button onClick={handleClear}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: confirmClear ? 'var(--danger)' : 'transparent',
                    color: confirmClear ? 'white' : 'var(--danger)',
                    border: '1px solid var(--danger)',
                  }}>
                  {confirmClear ? 'Confirm Clear' : 'Clear Data'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color?: string
}) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold" style={{ color: color ?? 'var(--accent)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}
