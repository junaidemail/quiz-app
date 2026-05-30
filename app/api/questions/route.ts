import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { Question } from '@/lib/types'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'questions.json')
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const questions = JSON.parse(fileContent)
    return NextResponse.json(questions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read questions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const questions: Question[] = await request.json()
    
    // Write questions.json
    const filePath = path.join(process.cwd(), 'public', 'data', 'questions.json')
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8')
    
    // Calculate and write metadata.json
    const metadataPath = path.join(process.cwd(), 'public', 'data', 'metadata.json')
    const subjects: Record<string, Record<string, number>> = {}
    for (const q of questions) {
      if (!subjects[q.subject]) subjects[q.subject] = {}
      const ch = q.chapterTitle || (q.chapter ? `Chapter ${q.chapter}` : 'General')
      if (!subjects[q.subject][ch]) subjects[q.subject][ch] = 0
      subjects[q.subject][ch]++
    }
    
    const metadata = {
      subjects,
      totalQuestions: questions.length
    }
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8')
    
    return NextResponse.json({ success: true, count: questions.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save questions' }, { status: 500 })
  }
}
