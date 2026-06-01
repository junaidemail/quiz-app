/**
 * Extract MCQs from 16-Elec-A6 Power Systems and Machines PENG docx files.
 * Outputs questions to a temp JSON for merging into public/data/questions.json.
 *
 * Files (all in E:\VSCode\Data\16-Elec-A6 Power Systems and Machines\):
 *   PENG_MCQ_Chapters_1-3.docx   - Q-format, (A)/(B)/(C)/(D) options
 *   PENG_MCQ_Chapters_4-6.docx   - Q-format
 *   PENG_MCQ_Chapters_7-15.docx  - Q-format
 *   PENG_MCQ_Chapters_16-30.docx - numbered format, A)/B)/C)/D) options
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUBJECT = '16-Elec-A6 Power Systems and Machines';
const SOURCE = '16-Elec-A6';
const DATA_DIR = 'E:\\VSCode\\Data\\16-Elec-A6 Power Systems and Machines';

// ─── XML extraction ──────────────────────────────────────────────────────────

function extractDocxText(filePath) {
  // Write a PS1 script file to avoid quoting issues with spaces in path
  const psScript = path.join(__dirname, '_extract_tmp.ps1');
  const escaped = filePath.replace(/'/g, "''");
  fs.writeFileSync(psScript, `
Add-Type -AssemblyName "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead('${escaped}')
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$reader = New-Object System.IO.StreamReader($entry.Open())
$content = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
$content | Out-File -FilePath '${psScript}.out' -Encoding utf8 -NoNewline
`.trim(), 'utf8');

  execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
    maxBuffer: 100 * 1024 * 1024,
  });

  const raw = fs.readFileSync(`${psScript}.out`, 'utf8');

  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x2019;/g, '’')
    .replace(/&#x2013;/g, '–')
    .replace(/&#x2014;/g, '—')
    .replace(/&#xB2;/g, '²')
    .replace(/&#xB3;/g, '³')
    .replace(/&#x03A9;/g, 'Ω')
    .replace(/&#x03BC;/g, 'μ')
    .replace(/&#x03C6;/g, 'φ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Chapter title maps ───────────────────────────────────────────────────────

const CHAPTER_TITLES = {
  1:  'Units',
  2:  'Fundamentals of Electricity, Magnetism, and Circuits',
  3:  'Fundamentals of Mechanics and Heat',
  4:  'DC Generators',
  5:  'Direct-Current Motors',
  6:  'Efficiency and Heating of Electrical Machines',
  7:  'Three-Phase Induction Motors: General Properties',
  8:  'Three-Phase Induction Motors: Equivalent Circuit and Performance',
  9:  'The Ideal Transformer',
  10: 'The Practical Transformer',
  11: 'Special Transformers',
  12: 'Three-Phase Transformers',
  13: 'Three-Phase Induction Motors: Design and Characteristics',
  14: 'Special Induction Machines',
  15: 'Synchronous Generators',
  16: 'Synchronous Generators (Advanced)',
  17: 'Synchronous Motors',
  18: 'Introduction to the Finite Element Method',
  19: 'Design of Synchronous Machines',
  20: 'Design of AC Induction Machines',
  21: 'Solid State Drives',
  22: 'DC Drives',
  23: 'AC Drives',
  24: 'Transients and Dynamics',
  25: 'Power System Analysis',
  26: 'Advanced Topics',
  27: 'Case Studies',
  28: 'Problem Solutions',
  29: 'Standards and Regulations',
  30: 'Index and References',
};

// ─── Parser for Q-format files (ch1-3, ch4-6, ch7-15) ────────────────────────

/**
 * Parse files with format:
 *   CHAPTER N: TITLE Questions 1-70 ...
 *   Q1. text (A) opt (B) opt (C) opt (D) opt
 *   ...
 *   ANSWER KEY WITH EXPLANATIONS
 *   Chapter N: Title Q1. text ? Answer: (X) Explanation: text
 */
function parseQFormat(text, chapterRange) {
  const [chStart, chEnd] = chapterRange;
  const questions = [];

  // ── Split questions section / answer section ──
  const answerKeyIdx = text.indexOf('ANSWER KEY WITH EXPLANATIONS');
  if (answerKeyIdx === -1) {
    console.warn('  WARNING: No ANSWER KEY section found');
    return questions;
  }
  const questionsText = text.substring(0, answerKeyIdx);
  const answersText   = text.substring(answerKeyIdx);

  // ── Parse chapter boundaries in questions section ──
  // Pattern: CHAPTER N: TITLE Questions X–Y (en-dash or hyphen)
  const chapterHeaderRe = /CHAPTER\s+(\d+):\s+([A-Z][^Q]+?)\s+Questions\s+\d+\s*[–\-]\s*\d+/gi;
  const chapterBoundaries = [];
  let m;
  while ((m = chapterHeaderRe.exec(questionsText)) !== null) {
    chapterBoundaries.push({
      chNum: parseInt(m[1]),
      title: m[2].trim(),
      textStart: m.index,
    });
  }

  // ── Parse answers for each chapter ──
  // Handles two answer formats:
  //   Format A: Q{n}. question_text ✔ Answer: (X) answer_text Explanation: text   (ch1-3, ch7-15 style)
  //   Format B: Q{n}. (X) explanation_text                                          (ch4-6 style)
  function parseChapterAnswers(chNum) {
    const chHeader = new RegExp(`CHAPTER\\s+${chNum}:|Chapter\\s+${chNum}:`, 'i');
    const m = chHeader.exec(answersText);
    if (!m) return {};

    const afterHeader = answersText.substring(m.index + m[0].length);
    const nextChapterRe = /\bCHAPTER\s+\d+:|\bChapter\s+\d+:/i;
    const nextM = nextChapterRe.exec(afterHeader);
    const section = nextM ? afterHeader.substring(0, nextM.index) : afterHeader;

    const answers = {};

    // Try Format A first: Q{n}. text ✔ Answer: (X) ... Explanation: text
    const fmtA = /Q(\d+)\.\s+(?:(?!✔|Answer:).)*(?:✔\s*)?Answer:\s*\(([A-D])\)\s*(.*?)(?=Q\d+\.|$)/gs;
    let am;
    let fmtACount = 0;
    while ((am = fmtA.exec(section)) !== null) {
      fmtACount++;
      const num = parseInt(am[1]);
      let explanation = (am[3] || '').trim();
      const explIdx = explanation.indexOf('Explanation:');
      if (explIdx !== -1) {
        explanation = explanation.substring(explIdx + 'Explanation:'.length).trim();
        const nextQ = explanation.search(/Q\d+\.|Chapter\s+\d+:/i);
        if (nextQ !== -1) explanation = explanation.substring(0, nextQ).trim();
      } else {
        explanation = '';
      }
      answers[num] = { letter: am[2], explanation };
    }

    // If Format A found no answers, try Format B: Q{n}. (X) explanation
    if (fmtACount === 0) {
      const fmtB = /Q(\d+)\.\s+\(([A-D])\)\s+(.*?)(?=Q\d+\.|$)/gs;
      while ((am = fmtB.exec(section)) !== null) {
        const num = parseInt(am[1]);
        const explanation = (am[3] || '').replace(/\s+/g, ' ').trim();
        answers[num] = { letter: am[2], explanation };
      }
    }

    return answers;
  }

  // ── Build global answer fallback map from all answer sections ──
  const globalAnswers = {};
  for (let ch = chStart; ch <= chEnd + 5; ch++) {
    const partial = parseChapterAnswers(ch);
    for (const [num, val] of Object.entries(partial)) {
      if (!globalAnswers[num]) globalAnswers[num] = val; // first chapter wins for same Q number
    }
  }

  // ── For each chapter, extract its questions ──
  for (let i = 0; i < chapterBoundaries.length; i++) {
    const cb = chapterBoundaries[i];
    const chNum = cb.chNum;
    if (chNum < chStart || chNum > chEnd) continue;

    const chTitle = CHAPTER_TITLES[chNum] || cb.title;

    // Text slice for this chapter's questions
    const sectionStart = cb.textStart;
    const sectionEnd   = i + 1 < chapterBoundaries.length
      ? chapterBoundaries[i + 1].textStart
      : questionsText.length;
    const section = questionsText.substring(sectionStart, sectionEnd);

    const chAnswers = parseChapterAnswers(chNum);

    // Parse questions: Q{n}. text (A) opt (B) opt (C) opt (D) opt
    const qRe = /Q(\d+)\.\s+((?:(?!Q\d+\.).)*)/gs;
    let qm;
    while ((qm = qRe.exec(section)) !== null) {
      const num = parseInt(qm[1]);
      const body = qm[2].trim();

      // Skip answer-section echoes
      if (body.includes('? Answer:') || body.startsWith('Answer:')) continue;

      // Parse options
      const optRe = /^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)$/s;
      const om = optRe.exec(body);
      if (!om) continue;

      const questionText = om[1].trim();
      if (!questionText || questionText.length < 5) continue;

      const optA = om[2].trim();
      const optB = om[3].trim();
      const optC = om[4].trim();
      // optD: trim trailing Q-prefix or stray text
      const optD = om[5].replace(/\s*Q\d+\..*$/s, '').trim();

      if (!optA || !optB || !optC || !optD) continue;

      const ans = chAnswers[num] || globalAnswers[num];

      questions.push({
        subject: SUBJECT,
        chapter: chNum,
        chapterTitle: chTitle,
        question: questionText,
        options: { A: optA, B: optB, C: optC, D: optD },
        answer: ans ? ans.letter : null,
        explanation: ans ? ans.explanation || null : null,
        source: SOURCE,
        _fileChNum: num, // for ID generation
      });
    }
  }

  return questions;
}

// ─── Parser for numbered format (ch16-30) ────────────────────────────────────

/**
 * Parse files with format:
 *   Chapter N: Title
 *   1. question text A) opt B) opt C) opt D) opt
 *   ...
 *   ANSWER KEY
 *   Chapter N: Title 1. Answer: X Explanation: text
 */
function parseNumberedFormat(text) {
  const questions = [];

  const answerKeyIdx = text.indexOf('ANSWER KEY');
  if (answerKeyIdx === -1) {
    console.warn('  WARNING: No ANSWER KEY found in ch16-30');
    return questions;
  }
  const questionsText = text.substring(0, answerKeyIdx);
  const answersText   = text.substring(answerKeyIdx);

  // ── Parse chapter boundaries ──
  // Pattern: Chapter N: Title (followed by questions)
  const chHeaderRe = /Chapter\s+(\d+):\s+([^\d]+?)(?=\s+1\.\s)/gi;
  const chapterBoundaries = [];
  let m;
  while ((m = chHeaderRe.exec(questionsText)) !== null) {
    const chNum = parseInt(m[1]);
    if (chNum < 16 || chNum > 30) continue;
    chapterBoundaries.push({
      chNum,
      title: CHAPTER_TITLES[chNum] || m[2].trim(),
      textStart: m.index,
    });
  }

  // ── Parse answers from answer section ──
  function parseChAnswers(chNum) {
    const ansHeaderRe = new RegExp(`Chapter\\s+${chNum}:\\s+[^\\d]+`, 'i');
    const am = ansHeaderRe.exec(answersText);
    if (!am) return {};

    const nextChRe = /Chapter\s+\d+:/i;
    const rest = answersText.substring(am.index + am[0].length);
    const nextM = nextChRe.exec(rest);
    const section = nextM ? rest.substring(0, nextM.index) : rest;

    const answers = {};
    // Pattern: {n}. Answer: X Explanation: text
    const aRe = /(\d+)\.\s+Answer:\s+([A-D])\s+Explanation:\s+(.*?)(?=\d+\.\s+Answer:|$)/gs;
    let r;
    while ((r = aRe.exec(section)) !== null) {
      answers[parseInt(r[1])] = {
        letter: r[2],
        explanation: r[3].trim(),
      };
    }
    return answers;
  }

  // ── Extract questions per chapter ──
  for (let i = 0; i < chapterBoundaries.length; i++) {
    const cb = chapterBoundaries[i];
    const sectionStart = cb.textStart;
    const sectionEnd   = i + 1 < chapterBoundaries.length
      ? chapterBoundaries[i + 1].textStart
      : questionsText.length;
    const section = questionsText.substring(sectionStart, sectionEnd);

    const chAnswers = parseChAnswers(cb.chNum);

    // Pattern: {n}. text A) opt B) opt C) opt D) opt
    const qRe = /(\d+)\.\s+((?:(?!\d+\.\s).)*)/gs;
    let qm;
    while ((qm = qRe.exec(section)) !== null) {
      const num = parseInt(qm[1]);
      if (num < 1 || num > 70) continue;
      const body = qm[2].trim();
      if (body.startsWith('Answer:')) continue;

      // Parse options: text A) opt B) opt C) opt D) opt
      const optRe = /^(.*?)\s*A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*?)$/s;
      const om = optRe.exec(body);
      if (!om) continue;

      let questionText = om[1].trim().replace(/^Related\s+to:\s*/i, '');
      if (!questionText || questionText.length < 5) continue;

      const cleanOpt = (s) => s.trim().replace(/^Alt\s+[A-D]:\s*/i, '');
      const optA = cleanOpt(om[2]);
      const optB = cleanOpt(om[3]);
      const optC = cleanOpt(om[4]);
      const optD = cleanOpt(om[5].replace(/\s*\d+\.\s.*$/s, ''));

      if (!optA || !optB || !optC || !optD) continue;

      const ans = chAnswers[num];

      questions.push({
        subject: SUBJECT,
        chapter: cb.chNum,
        chapterTitle: cb.title,
        question: questionText,
        options: { A: optA, B: optB, C: optC, D: optD },
        answer: ans ? ans.letter : null,
        explanation: ans ? ans.explanation || null : null,
        source: SOURCE,
        _fileChNum: num,
      });
    }
  }

  return questions;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const files = [
    { name: 'PENG_MCQ_Chapters_1-3.docx',   parser: 'qformat', range: [1, 3] },
    { name: 'PENG_MCQ_Chapters_4-6.docx',   parser: 'qformat', range: [4, 6] },
    { name: 'PENG_MCQ_Chapters_7-15.docx',  parser: 'qformat', range: [7, 15] },
    { name: 'PENG_MCQ_Chapters_16-30.docx', parser: 'numbered', range: [16, 30] },
  ];

  const allQuestions = [];
  const seen = new Set();

  for (const { name, parser, range } of files) {
    const filePath = path.join(DATA_DIR, name);
    console.log(`\nProcessing ${name}...`);

    let text;
    try {
      text = extractDocxText(filePath);
      console.log(`  Extracted ${text.length} chars`);
    } catch (err) {
      console.error(`  ERROR extracting: ${err.message}`);
      continue;
    }

    let questions = [];
    if (parser === 'qformat') {
      questions = parseQFormat(text, range);
    } else {
      questions = parseNumberedFormat(text);
    }

    console.log(`  Parsed ${questions.length} questions`);

    // Deduplicate by chapter+num combo
    for (const q of questions) {
      const key = `${q.chapter}_${q._fileChNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        delete q._fileChNum;
        allQuestions.push(q);
      }
    }
  }

  // Assign stable IDs: a6_ch{chapter}_q{n}
  // Sort by chapter first
  allQuestions.sort((a, b) => (a.chapter || 99) - (b.chapter || 99));

  const chCounters = {};
  for (const q of allQuestions) {
    const ch = q.chapter || 0;
    chCounters[ch] = (chCounters[ch] || 0) + 1;
    q.id = `a6_ch${ch}_q${chCounters[ch]}`;
  }

  console.log(`\nTotal A6 questions extracted: ${allQuestions.length}`);

  // Group summary
  const byChapter = {};
  for (const q of allQuestions) {
    const k = `${q.chapter}: ${q.chapterTitle}`;
    byChapter[k] = (byChapter[k] || 0) + 1;
  }
  for (const [ch, cnt] of Object.entries(byChapter).sort()) {
    const answered = allQuestions.filter(q => `${q.chapter}: ${q.chapterTitle}` === ch && q.answer !== null).length;
    console.log(`  Ch ${ch}: ${cnt} Qs (${answered} with answers)`);
  }

  // Write to temp file
  const outPath = path.join(__dirname, '..', 'scripts', 'a6_questions.json');
  fs.writeFileSync(outPath, JSON.stringify(allQuestions, null, 2));
  console.log(`\nWritten to ${outPath}`);
}

main();
