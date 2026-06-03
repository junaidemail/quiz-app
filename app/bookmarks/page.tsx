'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { getBookmarks, toggleBookmark } from '@/lib/storage'
import { loadQuestions } from '@/lib/questions'
import { saveSession } from '@/lib/storage'
import { createSession } from '@/lib/quiz-engine'
import { MathText } from '@/components/MathText'
import type { Question } from '@/lib/types'
import { Star, Play, Check, BookOpen, Loader2, Trash2 } from 'lucide-react'

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
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Star className="w-6 h-6 fill-[var(--warning)] text-[var(--warning)]" /> Bookmarks
            </h1>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {bookmarkedQs.length} saved question{bookmarkedQs.length !== 1 ? 's' : ''}
            </p>
          </div>
          {bookmarkedQs.length > 0 && (
            <button onClick={handleQuizBookmarks} className="btn-primary text-xs py-2 px-4 gap-1.5 cursor-pointer">
              <Play className="w-3.5 h-3.5" /> Quiz Bookmarks
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : bookmarkedQs.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center">
            <Star className="w-10 h-10 mb-4 text-[var(--fg-muted)]" />
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              No bookmarks yet
            </h3>
            <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
              Star questions during a quiz session to save them here.
            </p>
            <Link href="/quiz" className="btn-primary text-xs px-4 py-2 gap-1">
              <Play className="w-3 h-3" /> Start a Quiz
            </Link>
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
                className="w-full px-4 py-2.5 text-sm"
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
                      <span className="px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {q.subject}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => toggleExpand(q.id)}
                        className="text-[10px] px-2 py-1 bg-[var(--accent-light)] text-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer">
                        {expandedIds.has(q.id) ? 'Collapse' : 'Details'}
                      </button>
                      <button onClick={() => handleRemove(q.id)}
                        className="text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer"
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger-fg)' }}>
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                    <MathText text={q.question} />
                  </p>

                  {expandedIds.has(q.id) && (
                    <div className="mt-3 animate-fade" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => (
                          <div key={opt} className="text-sm p-2 flex items-start gap-2 border"
                            style={{
                              background: opt === q.answer ? 'var(--success-bg)' : 'var(--bg)',
                              color: opt === q.answer ? 'var(--success-fg)' : 'var(--fg-muted)',
                              borderColor: opt === q.answer ? 'var(--success)' : 'var(--border)',
                            }}>
                            <span className="font-bold min-w-5">{opt}.</span>
                            <span><MathText text={q.options[opt]} /></span>
                            {opt === q.answer && <Check className="ml-auto w-4 h-4 text-[var(--success-fg)]" />}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="p-3 text-xs leading-relaxed flex gap-2 border"
                          style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
                          <BookOpen className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          <div>
                            <span className="font-semibold">Explanation: </span>
                            <MathText text={q.explanation} />
                          </div>
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
