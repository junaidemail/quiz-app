'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/lib/storage'

type Theme = 'light' | 'dark'
interface ThemeCtx { theme: Theme; toggle: () => void }

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const settings = getSettings()
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = settings.darkMode ?? prefersDark
    setTheme(isDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggle = () => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      const s = getSettings()
      saveSettings({ ...s, darkMode: next === 'dark' })
      return next
    })
  }

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}
