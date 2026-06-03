'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { getStats, getSessions } from '@/lib/storage'
import type { QuizStats, QuizSession } from '@/lib/types'
import { formatTime } from '@/lib/quiz-engine'
import { loadQuestions, loadCourses } from '@/lib/questions'
import type { GroupInfo } from '@/lib/questions'
import { 
  Play, 
  Timer, 
  Layers, 
  BarChart2, 
  Percent, 
  Award, 
  Zap, 
  Target, 
  History,
  BookOpen
} from 'lucide-react'

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
        {/* Hero Banner */}
        <section className="py-12 border-b animate-fade" style={{ borderColor: 'var(--border)' }}>
          <div className="grid md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3">
              <span className="text-xs font-mono font-bold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
                Professional Preparation
              </span>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight mt-2 mb-4" style={{ color: 'var(--fg)' }}>
                Master <span className="font-semibold">Power Engineering</span>
              </h1>
              <p className="text-base mb-6 max-w-lg leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Prepare for the PENG &amp; Power Electronics exam with practice MCQs, timed examinations, and instant feedback. Developed based on classical textbooks.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/quiz" className="btn-primary text-sm px-5 py-3 gap-2">
                  <Play className="w-4 h-4" /> Start Practice
                </Link>
                <Link href="/quiz?mode=exam" className="btn-secondary text-sm px-5 py-3 gap-2">
                  <Timer className="w-4 h-4" /> Exam Mode
                </Link>
                <Link href="/quiz?mode=flashcard" className="btn-secondary text-sm px-5 py-3 gap-2">
                  <Layers className="w-4 h-4" /> Flashcards
                </Link>
              </div>
            </div>
            
            <div className="md:col-span-2 card p-6 flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-transparent to-[rgba(69,137,255,0.04)] border-l-4" style={{ borderLeftColor: 'var(--accent)' }}>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
                  Question Database Status
                </div>
                <h3 className="text-2xl font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                  {questionCount > 0 ? `${questionCount} Practice MCQs` : 'Loading Database...'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Fully updated for active preparation based on Theodore Wildi and Nilsson &amp; Riedel textbooks.
                </p>
              </div>
              
              <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Source Material</div>
                  <div className="text-xs font-mono font-semibold" style={{ color: 'var(--fg)' }}>Wildi &amp; Nilsson</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Format</div>
                  <div className="text-xs font-mono font-semibold" style={{ color: 'var(--fg)' }}>A/B/C/D MCQs</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-10">
          
          {/* Main Content (Left Column) */}
          <div className="md:col-span-2 flex flex-col gap-10">
            {/* Courses */}
            {groups.length > 0 && (
              <section className="animate-fade">
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
            <section className="animate-fade">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>Quiz Modes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ModeCard
                  icon={Target} title="Practice Mode"
                  desc="Get instant feedback after each answer with detailed explanations"
                  href="/quiz?mode=practice" />
                <ModeCard
                  icon={Timer} title="Exam Mode"
                  desc="Timed quiz with no feedback until the end — simulate the real exam"
                  href="/quiz?mode=exam" />
                <ModeCard
                  icon={Layers} title="Flashcard Mode"
                  desc="Flip through questions as study cards at your own pace"
                  href="/quiz?mode=flashcard" />
              </div>
            </section>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="md:col-span-1 flex flex-col gap-10">
            {/* Stats */}
            {stats && stats.totalQuizzes > 0 ? (
              <section className="animate-fade">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
                  Your Progress
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={BarChart2} label="Total Quizzes" value={stats.totalQuizzes} />
                  <StatCard icon={Percent} label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
                  <StatCard icon={Award} label="Best Score" value={`${stats.bestScore}%`} />
                  <StatCard icon={Zap} label="Study Streak" value={`${stats.streak} days`} />
                </div>
              </section>
            ) : (
              <section className="animate-fade">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
                  Your Progress
                </h2>
                <div className="card p-5 text-center">
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Complete a quiz to track your progress and study streak.
                  </p>
                </div>
              </section>
            )}

            {/* Recent Activity */}
            {recent.length > 0 && (
              <section className="animate-fade">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Recent Quizzes</h2>
                  <Link href="/stats" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
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
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-sm" style={{ color: 'var(--fg-muted)', borderTop: '1px solid var(--border)' }}>
        PowerQuiz — Electrical Engineering exam preparation · Nilsson &amp; Riedel
      </footer>
    </>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; color?: string }>; label: string; value: string | number }) {
  return (
    <div className="card p-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 mb-1.5" color="var(--accent)" />
      <div className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</div>
    </div>
  )
}

function CourseCard({ course }: { course: import('@/lib/questions').CourseInfo }) {
  const href = course.available ? `/quiz?subject=${encodeURIComponent(course.id)}` : '#'
  const color = course.available ? 'var(--accent)' : 'var(--fg-muted)'
  return (
    <div className={`card p-4 flex items-start gap-3 ${course.available ? 'hover:shadow-sm transition-all' : 'opacity-60'}`}
      style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono font-bold" style={{ color }}>{course.code}</span>
          {!course.available && (
            <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--fg)' }}>{course.name}</h3>
        {course.textbook && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>{course.textbook}</p>
        )}
      </div>
      {course.available && (
        <Link href={href} className="btn-primary text-xs px-3 py-1.5 shrink-0 gap-1">
          <Play className="w-3 h-3" /> Study
        </Link>
      )}
    </div>
  )
}

function ModeCard({ icon: Icon, title, desc, href }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card p-5 block hover:border-[var(--accent)] transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{title}</h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
    </Link>
  )
}

function RecentCard({ session }: { session: QuizSession }) {
  const date = new Date(session.startedAt).toLocaleDateString()
  const time = formatTime(Math.round(
    session.completedAt ? (session.completedAt - session.startedAt) / 1000 : 0
  ))
  const score = session.score ?? 0
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-[var(--border)] text-[var(--fg-muted)] flex items-center justify-center shrink-0">
          <History className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--fg)' }}>
            {session.config.subject === 'all' ? 'All Subjects' : session.config.subject}
            {' · '}{session.questions.length} Qs
          </p>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{date} · {time}</p>
        </div>
      </div>
      {session.completedAt && (
        <div className="text-lg font-bold shrink-0" style={{ color: scoreColor }}>
          {score}%
        </div>
      )}
    </div>
  )
}
