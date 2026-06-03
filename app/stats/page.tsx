'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getStats, getSessions, clearAllData } from '@/lib/storage'
import { formatTime, getGrade } from '@/lib/quiz-engine'
import type { QuizStats, QuizSession } from '@/lib/types'
import { BarChart2, HelpCircle, CheckCircle2, Target, Award, Clock, Zap, Play, Eye, Trash2 } from 'lucide-react'

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
      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Statistics</h1>
          <Link href="/" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>← Home</Link>
        </div>

        {!hasData ? (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <BarChart2 className="w-10 h-10 mb-4 text-[var(--fg-muted)]" />
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--fg)' }}>No data yet</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
              Complete a quiz session to see your progress and metrics here.
            </p>
            <Link href="/quiz" className="btn-primary text-xs px-4 py-2 gap-1">
              <Play className="w-3 h-3" /> Start a Quiz
            </Link>
          </div>
        ) : (
          <>
            {/* Overall stats */}
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fg-muted)' }}>
                Overall Performance
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={BarChart2} label="Total Quizzes" value={stats.totalQuizzes} />
                <StatCard icon={HelpCircle} label="Questions Answered" value={stats.totalQuestions} />
                <StatCard icon={CheckCircle2} label="Correct Answers" value={stats.correctAnswers} />
                <StatCard icon={Target} label="Overall Accuracy"
                  value={`${stats.accuracy.toFixed(1)}%`}
                  color={stats.accuracy >= 80 ? 'var(--success)' : stats.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'} />
                <StatCard icon={Award} label="Best Score"
                  value={`${stats.bestScore}%`}
                  color={stats.bestScore >= 80 ? 'var(--success)' : 'var(--warning)'} />
                <StatCard icon={Clock} label="Total Study Time"
                  value={formatTime(Math.round(stats.totalTimeSpent))} />
              </div>
            </section>

            {/* Streak */}
            <section className="mb-6">
              <div className="card p-4 flex items-center gap-4">
                <div className="p-3 bg-[rgba(241,194,27,0.08)] flex items-center justify-center border border-[rgba(241,194,27,0.2)]">
                  <Zap className="w-6 h-6 fill-[var(--warning)] text-[var(--warning)]" />
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--warning)' }}>
                    {stats.streak} day{stats.streak !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Current study streak
                    {stats.lastStudied && ` · Last studied: ${new Date(stats.lastStudied).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </section>

            {/* Subject breakdown */}
            {Object.keys(stats.subjectAccuracy).length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fg-muted)' }}>
                  By Subject
                </h2>
                <div className="card p-4 flex flex-col gap-3">
                  {Object.entries(stats.subjectAccuracy).map(([subj, data]) => {
                    const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0
                    const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
                    return (
                      <div key={subj}>
                        <div className="flex justify-between text-xs mb-1">
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
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--fg-muted)' }}>
                Quiz History ({sessions.length})
              </h2>
              <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                {sessions.map(s => {
                  const grade = s.score !== null ? getGrade(s.score) : null
                  const duration = s.completedAt
                    ? formatTime(Math.round((s.completedAt - s.startedAt) / 1000))
                    : 'In progress'
                  return (
                    <div key={s.id} className="card p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
                          {s.config.subject === 'all' ? 'All Subjects' : s.config.subject}
                          {' · '}{s.questions.length} Qs · {s.config.mode}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                          {new Date(s.startedAt).toLocaleDateString()} · {duration}
                        </p>
                      </div>
                      {s.completedAt && s.score !== null && (
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold" style={{
                            color: grade ? (
                              grade.color === 'text-green-500' ? 'var(--success)' :
                              grade.color === 'text-blue-500' ? 'var(--accent)' :
                              grade.color === 'text-yellow-500' ? 'var(--warning)' :
                              grade.color === 'text-red-500' ? 'var(--danger)' :
                              '#f97316'
                            ) : 'var(--fg-muted)'
                          }}>
                            {s.score}%
                          </span>
                          <Link href={`/results?id=${s.id}`}
                            className="text-[10px] px-2 py-1 bg-[var(--accent-light)] text-[var(--accent)] hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer">
                            <Eye className="w-3 h-3" /> View
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
              <div className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--fg)' }}>Clear Database</p>
                  <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                    Completely wipe out all study progress metrics and session histories.
                  </p>
                </div>
                <button onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  style={{
                    background: confirmClear ? 'var(--danger)' : 'transparent',
                    color: confirmClear ? 'white' : 'var(--danger)',
                    border: '1px solid var(--danger)',
                  }}>
                  <Trash2 className="w-3.5 h-3.5" />
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

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; color?: string }>; label: string; value: string | number; color?: string
}) {
  return (
    <div className="card p-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 mb-1.5" color={color ?? 'var(--accent)'} />
      <div className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}
