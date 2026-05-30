'use client'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'

export function Navbar() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home' },
    { href: '/quiz', label: 'Start Quiz' },
    { href: '/stats', label: 'Stats' },
    { href: '/bookmarks', label: 'Bookmarks' },
    { href: '/manage', label: 'Manage' },
  ]

  return (
    <nav style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
      className="sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg"
          style={{ color: 'var(--accent)' }}>
          ⚡ PowerQuiz
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {l.label}
            </Link>
          ))}
          <button onClick={toggle}
            className="ml-2 p-2 rounded-lg text-lg transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggle} className="p-2 text-lg" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-2" aria-label="Menu">
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border)' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--fg)' }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
