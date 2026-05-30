'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { getStats, getSessions } from '@/lib/storage'
import type { QuizStats, QuizSession } from '@/lib/types'
import { formatTime } from '@/lib/quiz-engine'
import { loadQuestions } from '@/lib/questions'

export default function Home() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [recent, setRecent] = useState<QuizSession[]>([])
  const [questionCount, setQuestionCount] = useState<number>(0)

  useEffect(() => {
    setStats(getStats())
    setRecent(getSessions().slice(0, 3))
    loadQuestions().then(qs => setQuestionCount(qs.length)).catch(() => {})
  }, [])

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="text-center py-10 animate-fade">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--fg)' }}>
            PowerQuiz
          </h1>
          <p className="text-lg mb-2" style={{ color: 'var(--fg-muted)' }}>
            Master Power Engineering & Power Electronics
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
            {questionCount} {questionCount === 1 ? 'MCQ' : 'MCQs'} · Practice Questions
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/quiz" className="btn-primary text-base px-8 py-3 rounded-xl inline-block">
              Start Quiz →
            </Link>
            <Link href="/quiz?mode=exam" className="btn-secondary text-base px-8 py-3 rounded-xl inline-block">
              Exam Mode ⏱
            </Link>
            <Link href="/quiz?mode=flashcard" className="btn-secondary text-base px-8 py-3 rounded-xl inline-block">
              Flashcards 🃏
            </Link>
          </div>
        </section>

        {/* Stats */}
        {stats && stats.totalQuizzes > 0 && (
          <section className="mb-8 animate-fade">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
              Your Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="📊" label="Total Quizzes" value={stats.totalQuizzes} />
              <StatCard icon="✅" label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
              <StatCard icon="🏆" label="Best Score" value={`${stats.bestScore}%`} />
              <StatCard icon="🔥" label="Study Streak" value={`${stats.streak} days`} />
            </div>
          </section>
        )}

        {/* Quick Start */}
        <section className="mb-8 animate-fade">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>Quick Start</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <QuickCard
              icon="📚" title="Power Systems & Machines" subtitle="16-Elec-A6 · Theodore Wildi"
              desc="750 questions across 30 chapters from Electrical Machines, Drives, and Power Systems"
              href="/quiz?subject=Power+Systems+and+Machines" color="#6366f1" />
            <QuickCard
              icon="⚡" title="Power Electronics" subtitle="16-Elec-A1"
              desc="311 questions on power semiconductor devices, converters, inverters, and control"
              href="/quiz?subject=Power+Electronics" color="#10b981" />
          </div>
        </section>

        {/* Quiz Modes */}
        <section className="mb-8 animate-fade">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>Quiz Modes</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <ModeCard
              icon="🎯" title="Practice Mode"
              desc="Get instant feedback after each answer with detailed explanations"
              href="/quiz?mode=practice" />
            <ModeCard
              icon="⏱" title="Exam Mode"
              desc="Timed quiz with no feedback until the end — simulate the real exam"
              href="/quiz?mode=exam" />
            <ModeCard
              icon="🃏" title="Flashcard Mode"
              desc="Flip through questions as study cards at your own pace"
              href="/quiz?mode=flashcard" />
          </div>
        </section>

        {/* Recent Activity */}
        {recent.length > 0 && (
          <section className="mb-8 animate-fade">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Recent Quizzes</h2>
              <Link href="/stats" className="text-sm" style={{ color: 'var(--accent)' }}>
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {recent.map(s => (
                <RecentCard key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

        {/* Topics */}
        <section className="mb-8 animate-fade">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>Topics Covered</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                📖 PENG — Theodore Wildi
              </h3>
              {[
                'Ch 1–3: Units, Electricity & Magnetism, Mechanics',
                'Ch 4–6: DC Generators, DC Motors, Efficiency',
                'Ch 7–15: Induction Motors, Transformers',
                'Ch 16–30: Synchronous Machines, AC/DC Drives',
              ].map(t => <p key={t} className="text-sm py-1" style={{ color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>• {t}</p>)}
            </div>
            <div className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                ⚡ Power Electronics
              </h3>
              {[
                'Ch 1–3: Power Semiconductors, Rectifiers, Inverters',
                'Ch 4–10: Advanced Converters, Buck/Boost, PWM',
                'Modulation, Control Systems, EMI/Filtering',
                'Gate Drivers, Protection, Thermal Design',
              ].map(t => <p key={t} className="text-sm py-1" style={{ color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>• {t}</p>)}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-6 text-sm" style={{ color: 'var(--fg-muted)', borderTop: '1px solid var(--border)' }}>
        PowerQuiz — Built for PENG exam preparation | Questions from Theodore Wildi &amp; Power Electronics textbooks
      </footer>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}

function QuickCard({ icon, title, subtitle, desc, href, color }: {
  icon: string; title: string; subtitle: string; desc: string; href: string; color: string
}) {
  return (
    <Link href={href} className="card p-5 block hover:shadow-md transition-shadow"
      style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-bold text-base" style={{ color: 'var(--fg)' }}>{title}</h3>
          <p className="text-xs mb-1" style={{ color: color }}>{subtitle}</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
        </div>
      </div>
    </Link>
  )
}

function ModeCard({ icon, title, desc, href }: { icon: string; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card p-4 block text-center hover:shadow-md transition-shadow">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
    </Link>
  )
}

function RecentCard({ session }: { session: QuizSession }) {
  const date = new Date(session.startedAt).toLocaleDateString()
  const time = formatTime(Math.round(
    session.completedAt ? (session.completedAt - session.startedAt) / 1000 : 0
  ))
  const score = session.score ?? 0
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>
          {session.config.subject === 'all' ? 'All Subjects' : session.config.subject}
          {' · '}{session.questions.length} questions
        </p>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{date} · {time}</p>
      </div>
      {session.completedAt && (
        <div className="text-2xl font-bold" style={{ color: scoreColor }}>
          {score}%
        </div>
      )}
    </div>
  )
}
