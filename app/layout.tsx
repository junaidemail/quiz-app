import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'PowerQuiz – PENG & Power Electronics MCQ',
  description: 'Master Power Engineering and Power Electronics with 1000+ practice MCQs. Features timed exams, instant feedback, and progress tracking.',
  keywords: 'PENG exam, power electronics MCQ, electrical engineering quiz, Theodore Wildi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
