'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { getBookmarks, toggleBookmark } from '@/lib/storage'
import { loadQuestions } from '@/lib/questions'
import { saveSession } from '@/lib/storage'
import { createSession } from '@/lib/quiz-engine'
import type { Question } from '@/lib/types'

export default function BookmarksPage() {
  const router = useRouter()
  const [bookmarkedQs, setBookmarkedQs] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadQuestions().then(allQs => {
      const ids = new Set(getBookmarks())
      setBookmarkedQs(allQs.filter(q => ids.has(q.id)))
      setLoading(false)
    })
  }, [])

  const handleRemove = (id: string) => {
    toggleBookmark(id)
    setBookmarkedQs(prev => prev.filter(q => q.id !== id))
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleQuizBookmarks = () => {
    if (bookmarkedQs.length === 0) return
    const session = createSession(bookmarkedQs, {
      subject: 'all',
      chapters: [],
      questionCount: bookmarkedQs.length,
      mode: 'practice',
      timePerQuestion: 0,
      difficulty: 'bookmarked',
      shuffleQuestions: true,
      shuffleOptions: false,
    }, new Set(bookmarkedQs.map(q => q.id)))
    saveSession(session)
    router.push(`/quiz/session?id=${session.id}`)
  }

  const filtered = bookmarkedQs.filter(q =>
    !searchTerm || q.question.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
              ⭐ Bookmarks
            </h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {bookmarkedQs.length} saved question{bookmarkedQs.length !== 1 ? 's' : ''}
            </p>
          </div>
          {bookmarkedQs.length > 0 && (
            <button onClick={handleQuizBookmarks} className="btn-primary">
              Quiz Bookmarks →
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-4xl animate-pulse">⭐</div>
          </div>
        ) : bookmarkedQs.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              No bookmarks yet
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              Star questions during a quiz to save them here
            </p>
            <Link href="/quiz" className="btn-primary">Start a Quiz →</Link>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="search"
                placeholder="Search bookmarks..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  outline: 'none',
                }}
              />
            </div>

            <div className="flex flex-col gap-3">
              {filtered.map(q => (
                <div key={q.id} className="card p-4 animate-fade">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {q.subject}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleExpand(q.id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {expandedIds.has(q.id) ? 'Less' : 'More'}
                      </button>
                      <button onClick={() => handleRemove(q.id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: '#fef2f2', color: '#ef4444' }}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                    {q.question}
                  </p>

                  {expandedIds.has(q.id) && (
                    <div className="mt-3 animate-fade" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => (
                          <div key={opt} className="text-sm p-2 rounded-lg flex items-start gap-2"
                            style={{
                              background: opt === q.answer ? '#ecfdf5' : 'var(--bg)',
                              color: opt === q.answer ? '#065f46' : 'var(--fg-muted)',
                              border: `1px solid ${opt === q.answer ? 'var(--success)' : 'var(--border)'}`,
                            }}>
                            <span className="font-bold min-w-5">{opt}.</span>
                            <span>{q.options[opt]}</span>
                            {opt === q.answer && <span className="ml-auto font-bold">✓</span>}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="p-3 rounded-lg text-xs leading-relaxed"
                          style={{ background: 'var(--accent-light)', color: 'var(--fg)' }}>
                          <span className="font-semibold">💡 </span>{q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
