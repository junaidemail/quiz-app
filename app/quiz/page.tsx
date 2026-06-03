'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { loadQuestions, getSubjects, getChapters, filterQuestions, SUBJECT_LABELS } from '@/lib/questions'
import type { ChapterInfo } from '@/lib/questions'
import { createSession } from '@/lib/quiz-engine'
import { saveSession, getBookmarks } from '@/lib/storage'
import type { Question, QuizConfig, QuizMode, SelectedChapter } from '@/lib/types'

const QUESTION_COUNTS = [10, 20, 30, 50, 75, 100]
const TIME_OPTIONS = [
  { label: 'No limit',            value: 0  },
  { label: '30 sec / question',   value: 30 },
  { label: '45 sec / question',   value: 45 },
  { label: '60 sec / question',   value: 60 },
  { label: '90 sec / question',   value: 90 },
]

function QuizSetup() {
  const router = useRouter()
  const params = useSearchParams()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading]     = useState(true)
  const [subject, setSubject]     = useState<string>(params.get('subject') || 'all')
  const [mode, setMode]           = useState<QuizMode>((params.get('mode') as QuizMode) || 'practice')
  const [count, setCount]         = useState(20)
  const [timePerQ, setTimePerQ]   = useState(0)
  const [shuffleQ, setShuffleQ]   = useState(true)
  const [shuffleOpts, setShuffleOpts] = useState(false)
  const [difficulty, setDifficulty]   = useState<'all' | 'bookmarked'>('all')
  const [selectedChapters, setSelectedChapters] = useState<SelectedChapter[]>([])
  const [allChapters, setAllChapters]           = useState<ChapterInfo[]>([])

  useEffect(() => {
    loadQuestions().then(qs => {
      setQuestions(qs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const chs = getChapters(questions, subject === 'all' ? undefined : subject)
    setAllChapters(chs)
    setSelectedChapters(chs.map(c => ({ chapter: c.chapter, chapterTitle: c.chapterTitle })))
  }, [questions, subject])

  const subjectChapters = (subj: string) =>
    allChapters.filter(c => c.subject === subj)

  const isChapterSelected = (c: ChapterInfo) =>
    selectedChapters.some(s => s.chapter === c.chapter && s.chapterTitle === c.chapterTitle)

  const toggleChapter = (c: ChapterInfo) => {
    const sel: SelectedChapter = { chapter: c.chapter, chapterTitle: c.chapterTitle }
    setSelectedChapters(prev =>
      isChapterSelected(c)
        ? prev.filter(s => !(s.chapter === c.chapter && s.chapterTitle === c.chapterTitle))
        : [...prev, sel]
    )
  }

  const toggleSubjectAll = (subj: string, check: boolean) => {
    const chs = subjectChapters(subj)
    if (check) {
      const toAdd = chs.map(c => ({ chapter: c.chapter, chapterTitle: c.chapterTitle }))
      setSelectedChapters(prev => {
        const existing = new Set(prev.map(s => `${s.chapter}||${s.chapterTitle}`))
        return [...prev, ...toAdd.filter(s => !existing.has(`${s.chapter}||${s.chapterTitle}`))]
      })
    } else {
      const remove = new Set(chs.map(c => `${c.chapter}||${c.chapterTitle}`))
      setSelectedChapters(prev => prev.filter(s => !remove.has(`${s.chapter}||${s.chapterTitle}`)))
    }
  }

  const availablePool = filterQuestions(questions, {
    subject,
    chapters: selectedChapters.length < allChapters.length ? selectedChapters : undefined,
    onlyWithAnswers: mode !== 'flashcard',
  })

  const bookmarks = getBookmarks()

  const handleStart = () => {
    if (availablePool.length === 0) return
    const config: QuizConfig = {
      subject,
      chapters: selectedChapters,
      questionCount: count,
      mode,
      timePerQuestion: mode === 'exam' ? (timePerQ || 60) : timePerQ,
      difficulty,
      shuffleQuestions: shuffleQ,
      shuffleOptions: shuffleOpts,
    }
    const session = createSession(questions, config, new Set(bookmarks))
    saveSession(session)
    router.push(`/quiz/session?id=${session.id}`)
  }

  const modeDescriptions: Record<QuizMode, string> = {
    practice:  'See correct answers and explanations immediately after each question',
    exam:      'Timed quiz — no feedback until all questions are completed',
    flashcard: 'Study cards — flip to reveal the answer at your own pace',
  }

  const subjects = getSubjects(questions)

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
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Configure Quiz</h1>
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
                    background:  mode === m ? 'var(--accent-light)' : 'var(--bg-card)',
                    color:       mode === m ? 'var(--accent)'       : 'var(--fg)',
                  }}>
                  {m === 'practice' ? '🎯' : m === 'exam' ? '⏱' : '🃏'}{' '}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2 px-1" style={{ color: 'var(--fg-muted)' }}>
              {modeDescriptions[mode]}
            </p>
          </Section>

          {/* Subject filter */}
          <Section title="Subject">
            <div className="flex flex-wrap gap-2">
              {(['all', ...subjects] as string[]).map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    borderColor: subject === s ? 'var(--accent)' : 'var(--border)',
                    background:  subject === s ? 'var(--accent-light)' : 'transparent',
                    color:       subject === s ? 'var(--accent)'       : 'var(--fg)',
                  }}>
                  {s === 'all' ? 'All Subjects' : (SUBJECT_LABELS[s] ?? s)}
                </button>
              ))}
            </div>
          </Section>

          {/* Chapter selection */}
          <Section title="Chapters">
            {(subject === 'all' ? subjects : [subject]).map(subj => {
              const chs       = subjectChapters(subj)
              const allSel    = chs.every(c => isChapterSelected(c))
              const noneSel   = chs.every(c => !isChapterSelected(c))
              const partialSel = !allSel && !noneSel
              return (
                <div key={subj} className="mb-4">
                  {subject === 'all' && (
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                        {SUBJECT_LABELS[subj] ?? subj}
                      </h4>
                      <button onClick={() => toggleSubjectAll(subj, !allSel)}
                        className="text-xs" style={{ color: 'var(--accent)' }}>
                        {allSel ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  )}
                  {subject !== 'all' && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {selectedChapters.filter(s => chs.some(c => c.chapter === s.chapter && c.chapterTitle === s.chapterTitle)).length} / {chs.length} selected
                      </span>
                      <button onClick={() => toggleSubjectAll(subj, !allSel)}
                        className="text-xs" style={{ color: 'var(--accent)' }}>
                        {allSel ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {chs.map(c => {
                      const sel = isChapterSelected(c)
                      return (
                        <label key={`${c.chapter}-${c.chapterTitle}`}
                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                          style={{ background: sel ? 'var(--accent-light)' : 'transparent' }}>
                          <input type="checkbox" checked={sel}
                            onChange={() => toggleChapter(c)}
                            className="w-4 h-4 accent-[var(--accent)]" />
                          <span className="flex-1 text-sm" style={{ color: 'var(--fg)' }}>
                            {c.chapter ? `Ch ${c.chapter}: ` : ''}{c.chapterTitle}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--fg-muted)' }}>
                            {c.count} Qs
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </Section>

          {/* Question Count */}
          <Section title={`Number of Questions (max ${Math.min(availablePool.length, 100)})`}>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map(n => {
                const capped = Math.min(n, 100)
                return (
                  <button key={n} onClick={() => setCount(capped)}
                    disabled={n > availablePool.length}
                    className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      borderColor: count === capped ? 'var(--accent)' : 'var(--border)',
                      background:  count === capped ? 'var(--accent-light)' : 'transparent',
                      color:       n > availablePool.length ? 'var(--fg-muted)' : count === capped ? 'var(--accent)' : 'var(--fg)',
                      opacity:     n > availablePool.length ? 0.4 : 1,
                    }}>
                    {n}
                  </button>
                )
              })}
            </div>
            <input type="range" min={1} max={Math.min(availablePool.length, 100)}
              value={count} onChange={e => setCount(+e.target.value)}
              className="w-full mt-2 accent-[var(--accent)]" />
            <p className="text-xs mt-1 text-center" style={{ color: 'var(--fg-muted)' }}>
              {count} questions selected
            </p>
          </Section>

          {/* Timer (exam mode only) */}
          {mode === 'exam' && (
            <Section title="Time Per Question">
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => setTimePerQ(t.value)}
                    className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                    style={{
                      borderColor: timePerQ === t.value ? 'var(--accent)' : 'var(--border)',
                      background:  timePerQ === t.value ? 'var(--accent-light)' : 'transparent',
                      color:       timePerQ === t.value ? 'var(--accent)'       : 'var(--fg)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Options */}
          <Section title="Options">
            <div className="flex flex-col gap-3">
              <Toggle label="Shuffle Questions"      checked={shuffleQ}    onChange={setShuffleQ} />
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

        <div className="mt-8">
          <button onClick={handleStart} disabled={availablePool.length === 0}
            className="btn-primary w-full py-3 text-base rounded-xl">
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
        style={{ width: 44, height: 24, background: checked ? 'var(--accent)' : 'var(--border)' }}>
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
