const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read DOCX file and extract raw text
function extractText(filePath) {
  const AdmZip = require('./adm-zip-shim');
  // Use built-in Node.js to read DOCX as ZIP
  const data = fs.readFileSync(filePath);

  // DOCX is a ZIP file; find word/document.xml
  let xmlContent = '';

  // Simple ZIP parser using built-in Node.js Buffer
  // We'll use a different approach - use the unzip via PowerShell
  return extractWithPS(filePath);
}

function extractWithPS(filePath) {
  const escaped = filePath.replace(/'/g, "''");
  const ps = `
Add-Type -AssemblyName "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead('${escaped}')
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$reader = New-Object System.IO.StreamReader($entry.Open())
$content = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
$content
`;
  const result = execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { maxBuffer: 50 * 1024 * 1024 });
  return result.toString('utf8');
}

// Clean XML to plain text
function cleanXml(xml) {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x2019;/g, "'")
    .replace(/&#x2013;/g, '–')
    .replace(/&#x2014;/g, '—')
    .replace(/&#xB2;/g, '²')
    .replace(/&#xB3;/g, '³')
    .replace(/&#x2070;/g, '⁰')
    .replace(/&#x2071;/g, '¹')
    .replace(/&#x2074;/g, '⁴')
    .replace(/&#x2075;/g, '⁵')
    .replace(/&#x2076;/g, '⁶')
    .replace(/&#x2077;/g, '⁷')
    .replace(/&#x2078;/g, '⁸')
    .replace(/&#x2079;/g, '⁹')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse questions from text
function parseQuestions(text, subject, sourceFile) {
  const questions = [];

  // Split into sections by chapter
  const chapterPattern = /CHAPTER\s+(\d+)[:\s]+([^\n]+?)(?=\s*(?:Questions|Q1\.))/gi;

  // Find question blocks - match Q{n}. ... Q{n+1}.
  const qPattern = /Q(\d+)\.\s+(.*?)(?=Q\d+\.|Answer:|$)/gs;
  const answerPattern = /Q(\d+)\.\s+(?:Answer:|✔\s*Answer:)\s*\(([A-D])\)\s*(.*?)(?=Q\d+\.|$)/gs;

  // Extract answers first
  const answers = {};
  const explanations = {};

  // Find the section with answers
  const answerSection = text.indexOf('Answer: (');
  if (answerSection > 0) {
    const answerText = text.substring(answerSection);

    // Pattern: Q{n}. Answer: (X) explanation OR just Answer: (X) explanation
    const aPatterns = [
      /Q(\d+)\.\s+(?:✔\s*)?Answer:\s*\(([A-D])\)\s*(?:[^\n(]*\n?)?\s*Explanation:\s*(.*?)(?=Q\d+\.|$)/gs,
      /Answer:\s*\(([A-D])\)\s*(.*?)(?=Answer:|Q\d+\.|$)/gs,
    ];

    // Simple sequential parsing of answers
    let remaining = answerText;
    let qNum = 1;

    const simpleAns = /(?:Q(\d+)\.)?\s*(?:✔\s*)?Answer:\s*\(([A-D])\)(?:\s*([^\n]*))?(?:\s*Explanation:\s*(.*?))?(?=Q\d+\.|Answer:|$)/gs;
    let m;
    while ((m = simpleAns.exec(answerText)) !== null) {
      const num = m[1] ? parseInt(m[1]) : qNum;
      answers[num] = m[2];
      explanations[num] = (m[4] || m[3] || '').trim().replace(/\s*\(This is a variant.*?\)/g, '').trim();
      qNum = num + 1;
    }
  }

  // Find chapter context for each question
  const chapterMap = {};
  const chapterMatches = [...text.matchAll(/CHAPTER\s+(\d+)[:\s]+([A-Z][^\n]+?)(?:\s*—\s*\d+\s*MCQs)?(?=\s)/gi)];

  // Find which chapter each question number belongs to
  // Look for chapter headers followed by "Questions N–M"
  const chRanges = [];
  for (const cm of chapterMatches) {
    const chNum = parseInt(cm[1]);
    const chTitle = cm[2].trim();
    const rangeMatch = text.substring(cm.index, cm.index + 200).match(/Questions\s+(\d+)[–-](\d+)/i);
    if (rangeMatch) {
      chRanges.push({ chapter: chNum, title: chTitle, start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) });
    }
  }

  function getChapter(qNum) {
    for (const r of chRanges) {
      if (qNum >= r.start && qNum <= r.end) return r;
    }
    return null;
  }

  // Parse questions
  const qMatches = [...text.matchAll(/Q(\d+)\.\s+((?:(?!Q\d+\.|Answer:).)*)/gs)];

  const seen = new Set(); // Deduplicate by question text

  for (const qm of qMatches) {
    const num = parseInt(qm[1]);
    const body = qm[2].trim();

    // Skip if this is in the answer section (starts after "Answer:")
    if (body.startsWith('Answer:') || body.startsWith('✔')) continue;

    // Skip variant questions
    if (body.includes('(Variant')) continue;

    // Parse question text and options
    // Question text comes before (A)
    const optionMatch = body.match(/^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)$/s);
    if (!optionMatch) continue;

    const questionText = optionMatch[1].trim();
    const optA = optionMatch[2].trim();
    const optB = optionMatch[3].trim();
    const optC = optionMatch[4].trim();
    const optD = optionMatch[5].trim().replace(/Q\d+\..*/s, '').trim();

    if (!questionText || questionText.length < 5) continue;

    // Deduplicate
    const key = questionText.toLowerCase().substring(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const ch = getChapter(num);
    const correctAnswer = answers[num];

    questions.push({
      id: `${subject.toLowerCase().replace(/\s+/g, '_')}_${num}`,
      subject,
      chapter: ch ? ch.chapter : null,
      chapterTitle: ch ? ch.title : null,
      question: questionText,
      options: { A: optA, B: optB, C: optC, D: optD },
      answer: correctAnswer || null,
      explanation: explanations[num] || null,
      source: path.basename(sourceFile),
    });
  }

  return questions;
}

async function main() {
  const dataDir = 'e:\\VSCode\\Data';
  const outDir = path.join(__dirname, '..', 'public', 'data');

  fs.mkdirSync(outDir, { recursive: true });

  const files = [
    { file: 'PENG_MCQ_Chapters_1-3.docx', subject: 'PENG' },
    { file: 'PENG_MCQ_Chapters_4-6.docx', subject: 'PENG' },
    { file: 'PENG_MCQ_Chapters_7-15.docx', subject: 'PENG' },
    { file: 'PENG_MCQ_Chapters_16-30.docx', subject: 'PENG' },
    { file: 'Power_Electronics_MCQ_With_Answers.docx', subject: 'Power Electronics' },
    { file: 'Power_Electronics_MCQ_Extended_Ch4-10.docx', subject: 'Power Electronics' },
    { file: 'Power_Electronics_MCQ_Chapters_11-20.docx', subject: 'Power Electronics' },
    { file: 'Power_Electronics_MCQ_Chapters_21-30.docx', subject: 'Power Electronics' },
    { file: 'Power_Electronics_MCQ_Chapters_31-40.docx', subject: 'Power Electronics' },
  ];

  const allQuestions = [];
  const globalSeen = new Set();
  let idCounter = 1;

  for (const { file, subject } of files) {
    const filePath = path.join(dataDir, file);
    console.log(`Processing ${file}...`);

    try {
      const xml = extractText(filePath);
      const text = cleanXml(xml);
      const qs = parseQuestions(text, subject, filePath);
      console.log(`  Found ${qs.length} questions`);

      for (const q of qs) {
        const key = q.question.toLowerCase().substring(0, 60);
        if (!globalSeen.has(key)) {
          globalSeen.add(key);
          q.id = `q${idCounter++}`;
          allQuestions.push(q);
        }
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`\nTotal unique questions: ${allQuestions.length}`);

  // Write output
  fs.writeFileSync(path.join(outDir, 'questions.json'), JSON.stringify(allQuestions, null, 2));
  console.log('Written to public/data/questions.json');

  // Write metadata
  const subjects = {};
  for (const q of allQuestions) {
    if (!subjects[q.subject]) subjects[q.subject] = {};
    const ch = q.chapterTitle || `Chapter ${q.chapter}` || 'General';
    if (!subjects[q.subject][ch]) subjects[q.subject][ch] = 0;
    subjects[q.subject][ch]++;
  }

  fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify({ subjects, totalQuestions: allQuestions.length }, null, 2));
  console.log('Written to public/data/metadata.json');
}

main().catch(console.error);
