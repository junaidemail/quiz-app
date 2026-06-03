'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getSessions, toggleBookmark, isBookmarked } from '@/lib/storage'
import { MathText } from '@/components/MathText'
import type { QuizSession } from '@/lib/types'

type Filter = 'all' | 'correct' | 'incorrect' | 'skipped' | 'flagged' | 'bookmarked'

function ReviewPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('id')

  const [session, setSession] = useState<QuizSession | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }
    const s = getSessions().find(s => s.id === sessionId)
    if (!s) { router.replace('/'); return }
    setSession(s)
  }, [sessionId, router])

  if (!session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-4xl animate-pulse">⚡</div>
    </div>
  )

  const toggleExpand = (i: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleBookmark = (id: string) => {
    const added = toggleBookmark(id)
    setBookmarks(prev => {
      const next = new Set(prev)
      added ? next.add(id) : next.delete(id)
      return next
    })
  }

  const filteredIndexes = session.questions.map((q, i) => i).filter(i => {
    const a = session.answers[i]
    const q = session.questions[i]
    if (filter === 'correct') return a.isCorrect === true
    if (filter === 'incorrect') return a.isCorrect === false
    if (filter === 'skipped') return a.selected === null
    if (filter === 'flagged') return a.flagged
    if (filter === 'bookmarked') return isBookmarked(q.id) || bookmarks.has(q.id)
    return true
  })

  const filterCounts = {
    all: session.questions.length,
    correct: session.answers.filter(a => a.isCorrect === true).length,
    incorrect: session.answers.filter(a => a.isCorrect === false).length,
    skipped: session.answers.filter(a => a.selected === null).length,
    flagged: session.answers.filter(a => a.flagged).length,
    bookmarked: 0,
  }

  const filterLabels: Record<Filter, string> = {
    all: `All (${filterCounts.all})`,
    correct: `✅ Correct (${filterCounts.correct})`,
    incorrect: `❌ Wrong (${filterCounts.incorrect})`,
    skipped: `⏭ Skipped (${filterCounts.skipped})`,
    flagged: `🚩 Flagged (${filterCounts.flagged})`,
    bookmarked: '⭐ Bookmarked',
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Review Answers</h1>
          <Link href={`/results?id=${session.id}`}
            className="text-sm" style={{ color: 'var(--accent)' }}>
            ← Results
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(filterLabels) as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={{
                borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? 'white' : 'var(--fg-muted)',
              }}>
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {filteredIndexes.length === 0 && (
            <div className="card p-8 text-center" style={{ color: 'var(--fg-muted)' }}>
              No questions in this filter
            </div>
          )}

          {filteredIndexes.map(i => {
            const q = session.questions[i]
            const a = session.answers[i]
            const isExpanded = expandedIds.has(i)
            const bk = isBookmarked(q.id) || bookmarks.has(q.id)

            const borderColor = a.isCorrect === true ? 'var(--success)' :
              a.isCorrect === false ? 'var(--danger)' :
                a.flagged ? '#f59e0b' : 'var(--border)'

            return (
              <div key={i} className="card p-4 animate-fade"
                style={{ borderLeft: `3px solid ${borderColor}` }}>
                {/* Question header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      Q{i + 1}
                    </span>
                    {a.isCorrect === true && <span className="text-sm">✅</span>}
                    {a.isCorrect === false && <span className="text-sm">❌</span>}
                    {a.selected === null && <span className="text-sm">⏭</span>}
                    {a.flagged && <span className="text-sm">🚩</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleBookmark(q.id)}
                      style={{ color: bk ? '#f59e0b' : 'var(--fg-muted)', fontSize: 18 }}>
                      {bk ? '⭐' : '☆'}
                    </button>
                    <button onClick={() => toggleExpand(i)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {isExpanded ? 'Collapse' : 'Details'}
                    </button>
                  </div>
                </div>

                <p className="text-sm font-medium mb-3" style={{ color: 'var(--fg)' }}>
                  <MathText text={q.question} />
                </p>

                {/* Answer summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {a.selected && (
                    <div className="text-xs p-2 rounded-lg"
                      style={{
                        background: a.isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: a.isCorrect ? 'var(--success-fg)' : 'var(--danger-fg)',
                      }}>
                      <span className="font-semibold">Your answer:</span>{' '}
                      ({a.selected}) <MathText text={q.options[a.selected as keyof typeof q.options]} />
                    </div>
                  )}
                  {!a.selected && (
                    <div className="text-xs p-2 rounded-lg"
                      style={{ background: 'var(--accent-light)', color: 'var(--fg-muted)' }}>
                      <span className="font-semibold">Not answered</span>
                    </div>
                  )}
                  {q.answer && (
                    <div className="text-xs p-2 rounded-lg"
                      style={{ background: 'var(--success-bg)', color: 'var(--success-fg)' }}>
                      <span className="font-semibold">Correct answer:</span>{' '}
                      ({q.answer}) <MathText text={q.options[q.answer as keyof typeof q.options]} />
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 animate-fade" style={{ borderTop: '1px solid var(--border)' }}>
                    {/* All options */}
                    <div className="flex flex-col gap-1.5 mb-3">
                      {(['A', 'B', 'C', 'D'] as const).map(opt => {
                        const isCorrect = opt === q.answer
                        const isSelected = opt === a.selected
                        return (
                          <div key={opt} className="text-sm p-2 rounded-lg flex items-start gap-2"
                            style={{
                              background: isCorrect ? 'var(--success-bg)' : isSelected && !isCorrect ? 'var(--danger-bg)' : 'var(--bg)',
                              color: isCorrect ? 'var(--success-fg)' : isSelected && !isCorrect ? 'var(--danger-fg)' : 'var(--fg-muted)',
                              border: `1px solid ${isCorrect ? 'var(--success)' : isSelected ? 'var(--danger)' : 'var(--border)'}`,
                            }}>
                            <span className="font-bold min-w-5">{opt}.</span>
                            <span><MathText text={q.options[opt]} /></span>
                            {isCorrect && <span className="ml-auto">✓</span>}
                            {isSelected && !isCorrect && <span className="ml-auto">✗</span>}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-lg text-xs leading-relaxed"
                        style={{ background: 'var(--accent-light)', color: 'var(--fg)' }}>
                        <span className="font-semibold">💡 Explanation: </span>
                        <MathText text={q.explanation} />
                      </div>
                    )}

                    <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                      Time: {a.timeSpent}s · Subject: {q.subject}
                      {q.chapterTitle && q.chapterTitle.length < 60 && ` · ${q.chapterTitle}`}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}

export default function ReviewPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-4xl animate-pulse">⚡</div></div>}>
      <ReviewPage />
    </Suspense>
  )
}
