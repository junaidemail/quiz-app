'use client'
import katex from 'katex'
import { useMemo } from 'react'

interface Props {
  text: string
  inline?: boolean
}

function renderMathInText(text: string): { html: string; isFallback: boolean } {
  const parts: string[] = []
  let lastIndex = 0
  const regex = /\\\(([\s\S]*?)\\\)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    parts.push(text.slice(lastIndex, match.index))
    try {
      parts.push(katex.renderToString(match[1], { displayMode: false, throwOnError: false }))
    } catch {
      parts.push(match[0])
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex === 0) {
    return { html: escapeHtml(text), isFallback: true }
  }

  parts.push(text.slice(lastIndex))
  return { html: parts.join(''), isFallback: false }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function MathText({ text }: Props) {
  const { html } = useMemo(() => renderMathInText(text), [text])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function InlineMath({ text }: Props) {
  return <MathText text={text} inline />
}
