'use client'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'

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
        <Link href="/" className="flex items-center gap-1 text-lg font-bold tracking-wider">
          <span style={{ color: 'var(--fg)' }}>POWER</span>
          <span style={{ color: 'var(--accent)', fontWeight: 300 }}>QUIZ</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="px-3 py-1.5 rounded-none text-sm font-medium transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-light)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fg-muted)'
              }}>
              {l.label}
            </Link>
          ))}
          <button onClick={toggle}
            className="ml-2 p-2 rounded-none transition-colors flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1">
          <button onClick={toggle}
            className="p-2 rounded-none transition-colors flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-2 flex items-center justify-center text-sm" style={{ color: 'var(--fg)' }} aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-1 animate-fade"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-none text-sm font-medium transition-colors"
              style={{ color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-light)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fg-muted)'
              }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
