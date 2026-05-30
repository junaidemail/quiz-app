'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { loadQuestions, getSubjects, getSources, getSourceLabel } from '@/lib/questions'
import { createSession } from '@/lib/quiz-engine'
import { saveSession, getBookmarks, getSessions } from '@/lib/storage'
import type { Question, QuizConfig, QuizMode } from '@/lib/types'

const QUESTION_COUNTS = [10, 20, 30, 50, 75, 100]
const TIME_OPTIONS = [
  { label: 'No limit', value: 0 },
  { label: '30 sec / question', value: 30 },
  { label: '45 sec / question', value: 45 },
  { label: '60 sec / question', value: 60 },
  { label: '90 sec / question', value: 90 },
]

function QuizSetup() {
  const router = useRouter()
  const params = useSearchParams()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const [subject, setSubject] = useState<string>(params.get('subject') || 'all')
  const [sources, setSources] = useState<string[]>([])
  const [mode, setMode] = useState<QuizMode>((params.get('mode') as QuizMode) || 'practice')
  const [count, setCount] = useState(20)
  const [timePerQ, setTimePerQ] = useState(0)
  const [shuffleQ, setShuffleQ] = useState(true)
  const [shuffleOpts, setShuffleOpts] = useState(false)
  const [difficulty, setDifficulty] = useState<'all' | 'bookmarked'>('all')
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  useEffect(() => {
    loadQuestions().then(qs => {
      setQuestions(qs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const s = getSources(questions, subject === 'all' ? undefined : subject)
    setSources(s)
    setSelectedSources(s) // select all by default
  }, [questions, subject])

  const toggleSource = (src: string) => {
    setSelectedSources(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    )
  }

  const availablePool = questions.filter(q => {
    if (subject !== 'all' && q.subject !== subject) return false
    if (selectedSources.length && !selectedSources.includes(q.source)) return false
    if (mode !== 'flashcard' && !q.answer) return false
    return true
  })

  const bookmarks = getBookmarks()

  const handleStart = () => {
    if (availablePool.length === 0) return

    const config: QuizConfig = {
      subject: subject as QuizConfig['subject'],
      sources: selectedSources,
      questionCount: count,
      mode,
      timePerQuestion: mode === 'exam' ? (timePerQ || 60) : timePerQ,
      difficulty,
      shuffleQuestions: shuffleQ,
      shuffleOptions: shuffleOpts,
    }

    const allBookmarked = new Set(bookmarks)
    const session = createSession(questions, config, allBookmarked)
    saveSession(session)
    router.push(`/quiz/session?id=${session.id}`)
  }

  const modeDescriptions: Record<QuizMode, string> = {
    practice: 'See correct answers and explanations immediately after each question',
    exam: 'Timed quiz — no feedback until all questions are completed',
    flashcard: 'Study cards — flip to reveal the answer at your own pace',
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⚡</div>
          <p style={{ color: 'var(--fg-muted)' }}>Loading questions...</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Configure Quiz</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
          {availablePool.length} questions available with current settings
        </p>

        <div className="flex flex-col gap-5">
          {/* Mode */}
          <Section title="Quiz Mode">
            <div className="grid grid-cols-3 gap-2">
              {(['practice', 'exam', 'flashcard'] as QuizMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="p-3 rounded-xl text-sm font-medium border-2 transition-all"
                  style={{
                    borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
                    background: mode === m ? 'var(--accent-light)' : 'var(--bg-card)',
                    color: mode === m ? 'var(--accent)' : 'var(--fg)',
                  }}>
                  {m === 'practice' ? '🎯' : m === 'exam' ? '⏱' : '🃏'} {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              {modeDescriptions[mode]}
            </p>
          </Section>

          {/* Subject */}
          <Section title="Subject">
            <div className="flex flex-wrap gap-2">
              {['all', 'PENG', 'Power Electronics'].map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    borderColor: subject === s ? 'var(--accent)' : 'var(--border)',
                    background: subject === s ? 'var(--accent-light)' : 'transparent',
                    color: subject === s ? 'var(--accent)' : 'var(--fg)',
                  }}>
                  {s === 'all' ? 'All Subjects' : s}
                </button>
              ))}
            </div>
          </Section>

          {/* Sources / Chapters */}
          {sources.length > 0 && (
            <Section title="Chapters / Sources">
              <div className="flex flex-col gap-2">
                <button onClick={() => setSelectedSources(
                  selectedSources.length === sources.length ? [] : [...sources]
                )}
                  className="text-xs text-left" style={{ color: 'var(--accent)' }}>
                  {selectedSources.length === sources.length ? 'Deselect all' : 'Select all'}
                </button>
                {sources.map(src => (
                  <label key={src} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                    style={{ background: selectedSources.includes(src) ? 'var(--accent-light)' : 'transparent' }}>
                    <input type="checkbox" checked={selectedSources.includes(src)}
                      onChange={() => toggleSource(src)} className="w-4 h-4 accent-indigo-500" />
                    <span className="text-sm" style={{ color: 'var(--fg)' }}>{getSourceLabel(src)}</span>
                  </label>
                ))}
              </div>
            </Section>
          )}

          {/* Question Count */}
          <Section title={`Number of Questions (max ${Math.min(availablePool.length, 100)})`}>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map(n => {
                const maxAvail = availablePool.length
                const capped = Math.min(n, 100)
                return (
                  <button key={n} onClick={() => setCount(capped)}
                    disabled={n > maxAvail}
                    className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      borderColor: count === capped ? 'var(--accent)' : 'var(--border)',
                      background: count === capped ? 'var(--accent-light)' : 'transparent',
                      color: n > maxAvail ? 'var(--fg-muted)' : count === capped ? 'var(--accent)' : 'var(--fg)',
                      opacity: n > maxAvail ? 0.4 : 1,
                    }}>
                    {n}
                  </button>
                )
              })}
            </div>
            <input type="range" min={1} max={Math.min(availablePool.length, 100)}
              value={count} onChange={e => setCount(+e.target.value)}
              className="w-full mt-2 accent-indigo-500" />
            <p className="text-xs mt-1 text-center" style={{ color: 'var(--fg-muted)' }}>
              {count} questions selected
            </p>
          </Section>

          {/* Timer (exam mode) */}
          {mode === 'exam' && (
            <Section title="Time Per Question">
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => setTimePerQ(t.value)}
                    className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                    style={{
                      borderColor: timePerQ === t.value ? 'var(--accent)' : 'var(--border)',
                      background: timePerQ === t.value ? 'var(--accent-light)' : 'transparent',
                      color: timePerQ === t.value ? 'var(--accent)' : 'var(--fg)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Options */}
          <Section title="Options">
            <div className="flex flex-col gap-2">
              <Toggle label="Shuffle Questions" checked={shuffleQ} onChange={setShuffleQ} />
              <Toggle label="Shuffle Answer Options" checked={shuffleOpts} onChange={setShuffleOpts} />
              {bookmarks.length > 0 && (
                <Toggle
                  label={`Bookmarked Questions Only (${bookmarks.length} saved)`}
                  checked={difficulty === 'bookmarked'}
                  onChange={v => setDifficulty(v ? 'bookmarked' : 'all')} />
              )}
            </div>
          </Section>
        </div>

        {/* Start button */}
        <div className="mt-8 flex gap-3">
          <button onClick={handleStart} disabled={availablePool.length === 0}
            className="btn-primary flex-1 py-3 text-base rounded-xl">
            Start Quiz ({Math.min(count, availablePool.length)} questions) →
          </button>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--fg)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--fg)' }}>{label}</span>
      <div onClick={() => onChange(!checked)}
        className="relative rounded-full cursor-pointer transition-colors"
        style={{
          width: 44, height: 24,
          background: checked ? 'var(--accent)' : 'var(--border)',
        }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s',
        }} />
      </div>
    </label>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><p>Loading...</p></div>}>
      <QuizSetup />
    </Suspense>
  )
}
