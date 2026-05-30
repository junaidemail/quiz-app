import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}
      className="flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">⚡</div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--fg)' }}>404</h1>
        <p className="text-lg mb-6" style={{ color: 'var(--fg-muted)' }}>
          This page doesn't exist
        </p>
        <Link href="/" className="btn-primary text-base px-8 py-3 rounded-xl inline-block">
          ← Go Home
        </Link>
      </div>
    </div>
  )
}
