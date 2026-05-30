'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { getStats, getSessions } from '@/lib/storage'
import type { QuizStats, QuizSession } from '@/lib/types'
import { formatTime } from '@/lib/quiz-engine'
import { loadQuestions, loadCourses } from '@/lib/questions'
import type { GroupInfo } from '@/lib/questions'

export default function Home() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [recent, setRecent] = useState<QuizSession[]>([])
  const [questionCount, setQuestionCount] = useState<number>(0)
  const [groups, setGroups] = useState<GroupInfo[]>([])

  useEffect(() => {
    setStats(getStats())
    setRecent(getSessions().slice(0, 3))
    loadQuestions().then(qs => setQuestionCount(qs.length)).catch(() => {})
    loadCourses().then(setGroups).catch(() => {})
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
            Electrical Engineering Exam Preparation
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
            {questionCount > 0 ? `${questionCount} MCQs` : 'Loading...'} · Practice Questions
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

        {/* Course Groups */}
        {groups.length > 0 && (
          <section className="mb-8 animate-fade">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>Courses</h2>
            <div className="flex flex-col gap-6">
              {groups.map(group => (
                <div key={group.id}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 px-1"
                    style={{ color: 'var(--fg-muted)' }}>
                    {group.name}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {group.courses.map(course => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
      </main>

      <footer className="text-center py-6 text-sm" style={{ color: 'var(--fg-muted)', borderTop: '1px solid var(--border)' }}>
        PowerQuiz — Electrical Engineering exam preparation · Nilsson &amp; Riedel
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

function CourseCard({ course }: { course: import('@/lib/questions').CourseInfo }) {
  const href = course.available ? `/quiz?subject=${encodeURIComponent(course.id)}` : '#'
  const color = course.available ? 'var(--accent)' : 'var(--fg-muted)'
  return (
    <div className={`card p-4 flex items-start gap-3 ${course.available ? 'hover:shadow-md transition-shadow' : 'opacity-60'}`}
      style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono font-bold" style={{ color }}>{course.code}</span>
          {!course.available && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{course.name}</h3>
        {course.textbook && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>{course.textbook}</p>
        )}
      </div>
      {course.available && (
        <Link href={href} className="btn-primary text-xs px-3 py-1.5 shrink-0">
          Study →
        </Link>
      )}
    </div>
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
