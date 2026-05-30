'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import type { Question } from '@/lib/types'

export default function ManageQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterChapter, setFilterChapter] = useState('all')

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // Import/Export Modal State
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  // Form Fields
  const [formSubject, setFormSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [formChapter, setFormChapter] = useState('')
  const [formChapterTitle, setFormChapterTitle] = useState('')
  const [formQuestionText, setFormQuestionText] = useState('')
  const [formOptA, setFormOptA] = useState('')
  const [formOptB, setFormOptB] = useState('')
  const [formOptC, setFormOptC] = useState('')
  const [formOptD, setFormOptD] = useState('')
  const [formAnswer, setFormAnswer] = useState('A')
  const [formExplanation, setFormExplanation] = useState('')

  // Load questions on mount
  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/questions')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data)
      } else {
        showNotification('error', 'Failed to load questions from local server.')
      }
    } catch (err) {
      showNotification('error', 'An error occurred while fetching questions.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleSaveQuestions = async (updatedList: Question[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      })
      if (res.ok) {
        const data = await res.json()
        setQuestions(updatedList)
        showNotification('success', `Questions saved successfully! Current total: ${data.count}.`)
        return true
      } else {
        const errData = await res.json()
        showNotification('error', errData.error || 'Failed to save questions to disk.')
        return false
      }
    } catch (err) {
      showNotification('error', 'Network error occurred while saving questions.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const subjects = [...new Set(questions.map((q) => q.subject))]
  const chapters = [...new Set(questions
    .filter(q => filterSubject === 'all' || q.subject === filterSubject)
    .map(q => q.chapter)
    .filter((ch): ch is number => ch !== null)
  )].sort((a, b) => a - b)

  // Reset form inputs
  const resetForm = () => {
    setEditingQuestion(null)
    setFormSubject(subjects[0] || 'Power Systems and Machines')
    setCustomSubject('')
    setFormChapter('')
    setFormChapterTitle('')
    setFormQuestionText('')
    setFormOptA('')
    setFormOptB('')
    setFormOptC('')
    setFormOptD('')
    setFormAnswer('A')
    setFormExplanation('')
  }

  const openAddModal = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const openEditModal = (q: Question) => {
    setEditingQuestion(q)
    setFormSubject(q.subject)
    setCustomSubject('')
    setFormChapter(q.chapter !== null ? String(q.chapter) : '')
    setFormChapterTitle(q.chapterTitle || '')
    setFormQuestionText(q.question)
    setFormOptA(q.options.A)
    setFormOptB(q.options.B)
    setFormOptC(q.options.C)
    setFormOptD(q.options.D)
    setFormAnswer(q.answer || 'A')
    setFormExplanation(q.explanation || '')
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return
    const updated = questions.filter((q) => q.id !== id)
    await handleSaveQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalSubject = formSubject === 'custom' ? customSubject.trim() : formSubject
    if (!finalSubject) {
      alert('Please specify a subject.')
      return
    }

    if (!formQuestionText.trim() || !formOptA.trim() || !formOptB.trim() || !formOptC.trim() || !formOptD.trim()) {
      alert('Please fill out the question text and all options (A-D).')
      return
    }

    const questionData: Question = {
      id: editingQuestion ? editingQuestion.id : `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      subject: finalSubject,
      chapter: formChapter ? parseInt(formChapter, 10) : null,
      chapterTitle: formChapterTitle.trim() || null,
      question: formQuestionText.trim(),
      options: {
        A: formOptA.trim(),
        B: formOptB.trim(),
        C: formOptC.trim(),
        D: formOptD.trim(),
      },
      answer: formAnswer,
      explanation: formExplanation.trim() || null,
      source: editingQuestion ? editingQuestion.source : 'User Created',
    }

    let updatedList: Question[]
    if (editingQuestion) {
      updatedList = questions.map((q) => (q.id === editingQuestion.id ? questionData : q))
    } else {
      updatedList = [...questions, questionData]
    }

    const success = await handleSaveQuestions(updatedList)
    if (success) {
      setIsFormOpen(false)
      resetForm()
    }
  }

  const handleImport = async () => {
    setImportError('')
    try {
      const parsed = JSON.parse(importText)
      if (!Array.isArray(parsed)) {
        setImportError('Import content must be a JSON array.')
        return
      }

      // Basic validation
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i]
        if (!item.question || !item.options || !item.options.A || !item.options.B || !item.options.C || !item.options.D || !item.subject) {
          setImportError(`Item at index ${i} is missing required fields (question, options A-D, subject).`)
          return
        }
      }

      // Merge or overwrite
      if (confirm(`Do you want to MERGE these ${parsed.length} questions into your existing database? (Click cancel to OVERWRITE current database completely)`)) {
        // Generate unique IDs for imported items to avoid collisions
        const cleanImport = parsed.map((q, idx) => ({
          ...q,
          id: q.id || `q_imported_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          source: q.source || 'Imported File'
        }))
        const merged = [...questions, ...cleanImport]
        const success = await handleSaveQuestions(merged)
        if (success) setIsImportOpen(false)
      } else {
        if (confirm(`WARNING: This will delete the current ${questions.length} questions. Are you sure you want to OVERWRITE?`)) {
          const cleanImport = parsed.map((q, idx) => ({
            ...q,
            id: q.id || `q_imported_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
            source: q.source || 'Imported File'
          }))
          const success = await handleSaveQuestions(cleanImport)
          if (success) setIsImportOpen(false)
        }
      }
    } catch (err: any) {
      setImportError(`Invalid JSON: ${err.message}`)
    }
  }

  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', 'questions_backup.json')
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Filtered List
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchTerm ||
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesSubject = filterSubject === 'all' || q.subject === filterSubject
    const matchesChapter =
      filterChapter === 'all' ||
      (filterChapter === 'null' && q.chapter === null) ||
      (q.chapter !== null && String(q.chapter) === filterChapter)

    return matchesSearch && matchesSubject && matchesChapter
  })

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Notification Banner */}
        {notification && (
          <div
            className={`fixed top-16 right-4 z-50 p-4 rounded-xl shadow-lg border animate-slide max-w-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span>{notification.type === 'success' ? '✅' : '❌'}</span>
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--fg)' }}>
              Question Manager
            </h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              Add, edit, remove or import multiple choice questions for your Quiz App database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={openAddModal} className="btn-primary flex items-center gap-1.5 py-2.5">
              <span>➕</span> Add Question
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="btn-secondary flex items-center gap-1.5 py-2.5"
            >
              <span>📥</span> Import / Export
            </button>
            {questions.length > 0 && (
              <button
                onClick={handleDownloadBackup}
                className="btn-secondary flex items-center gap-1.5 py-2.5"
              >
                <span>💾</span> Backup JSON
              </button>
            )}
          </div>
        </div>

        {/* Info Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {questions.length}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Total Questions
            </div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
              {subjects.length}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Subjects Created
            </div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {questions.filter((q) => q.chapter !== null).length}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Categorized in Chapters
            </div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {questions.filter((q) => !q.explanation).length}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Missing Explanations
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="card p-4 mb-6 grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--fg-muted)' }}>
              Search Text
            </label>
            <input
              type="text"
              placeholder="Search question, options, or explanation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--fg-muted)' }}>
              Filter Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value)
                setFilterChapter('all')
              }}
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
            >
              <option value="all">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: 'var(--fg-muted)' }}>
              Filter Chapter
            </label>
            <select
              value={filterChapter}
              onChange={(e) => setFilterChapter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
            >
              <option value="all">All Chapters</option>
              <option value="null">No Chapter (General)</option>
              {chapters.map((ch) => (
                <option key={ch} value={String(ch)}>
                  Chapter {ch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions Listing */}
        {loading ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3 animate-pulse">⚡</div>
            <p style={{ color: 'var(--fg-muted)' }}>Loading database...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              No questions found
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
              {questions.length === 0
                ? 'Your quiz database is currently empty. Click the "+ Add Question" button to start creating questions!'
                : 'No questions matched your search criteria. Try modifying your filters.'}
            </p>
            {questions.length === 0 && (
              <button onClick={openAddModal} className="btn-primary">
                Add Your First Question
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
              <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
            </div>
            {filteredQuestions.map((q, idx) => (
              <div key={q.id} className="card p-5 hover:shadow-sm transition-shadow animate-fade">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      {q.subject}
                    </span>
                    {q.chapter !== null && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}
                      >
                        Ch {q.chapter}
                        {q.chapterTitle ? `: ${q.chapterTitle}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(q)}
                      className="text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="text-base font-medium mb-4" style={{ color: 'var(--fg)' }}>
                  <span className="text-xs font-bold mr-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    #{idx + 1}
                  </span>
                  {q.question}
                </div>

                <div className="grid md:grid-cols-2 gap-2 mb-3">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div
                      key={opt}
                      className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${
                        q.answer === opt
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200'
                          : 'border-transparent bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span
                        className={`font-bold shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                          q.answer === opt
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {opt}
                      </span>
                      <span>{q.options[opt]}</span>
                      {q.answer === opt && <span className="ml-auto text-emerald-600">✔ Correct</span>}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div
                    className="p-3 rounded-lg text-xs leading-relaxed mt-2"
                    style={{ background: 'var(--accent-light)', color: 'var(--fg)' }}
                  >
                    <span className="font-semibold">💡 Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal: Form to Add/Edit Question */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl flex flex-col p-6 animate-scale border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                  {editingQuestion ? '✏️ Edit Question' : '➕ Add Question'}
                </h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                      Subject <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                    >
                      {subjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="custom">-- Custom Subject --</option>
                    </select>

                    {formSubject === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom subject..."
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent mt-2"
                        style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                        required
                      />
                    )}
                  </div>

                  {/* Chapter */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                      Chapter Number (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={formChapter}
                      onChange={(e) => setFormChapter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Chapter Title */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                    Chapter Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Transformers or Three-Phase Circuits"
                    value={formChapterTitle}
                    onChange={(e) => setFormChapterTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                  />
                </div>

                {/* Question */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                    Question Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter the question text..."
                    value={formQuestionText}
                    onChange={(e) => setFormQuestionText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent min-h-20"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                    required
                  />
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>
                      Option A <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Answer option A"
                      value={formOptA}
                      onChange={(e) => setFormOptA(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>
                      Option B <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Answer option B"
                      value={formOptB}
                      onChange={(e) => setFormOptB(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>
                      Option C <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Answer option C"
                      value={formOptC}
                      onChange={(e) => setFormOptC(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>
                      Option D <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Answer option D"
                      value={formOptD}
                      onChange={(e) => setFormOptD(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Correct Answer */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                      Correct Answer option <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formAnswer}
                      onChange={(e) => setFormAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                    Explanation (Optional)
                  </label>
                  <textarea
                    placeholder="Enter the explanation/hint text explaining why the answer is correct..."
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent min-h-20"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-2" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="btn-secondary py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-2 flex items-center gap-1.5"
                  >
                    {saving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Import/Export JSON */}
        {isImportOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="w-full max-w-xl rounded-2xl shadow-xl flex flex-col p-6 animate-scale border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                  📥 Import Questions from JSON
                </h2>
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Paste a JSON array of questions matching the system format. Expected properties for each question item:
                  <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1.5 select-all overflow-x-auto text-[10px]">
                    {`[
  {
    "subject": "Power Electronics",
    "chapter": 1,
    "chapterTitle": "Introduction",
    "question": "What is the primary function of a rectifier?",
    "options": {
      "A": "Convert DC to AC",
      "B": "Convert AC to DC",
      "C": "Convert AC to AC at different frequency",
      "D": "Convert DC to DC"
    },
    "answer": "B",
    "explanation": "A rectifier converts alternating current (AC) to direct current (DC)."
  }
]`}
                  </code>
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                    Paste JSON Content
                  </label>
                  <textarea
                    placeholder="Paste JSON array here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-transparent min-h-48 font-mono"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg)', outline: 'none' }}
                  />
                  {importError && (
                    <p className="text-rose-500 text-xs mt-1.5 font-medium">⚠️ {importError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="btn-secondary py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={saving || !importText.trim()}
                    className="btn-primary py-2"
                  >
                    {saving ? 'Saving...' : 'Import Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
