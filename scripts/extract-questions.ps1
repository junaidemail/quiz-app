Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$dataDir = "e:\VSCode\Data"
$outDir = "e:\VSCode\Quiz App\quiz-app\public\data"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Get-DocxText($filePath) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    $entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $content = $reader.ReadToEnd()
    $reader.Close()
    $zip.Dispose()
    $text = $content `
        -replace '<[^>]+>', ' ' `
        -replace '&amp;', '&' `
        -replace '&apos;', "'" `
        -replace '&lt;', '<' `
        -replace '&gt;', '>' `
        -replace '&quot;', '"' `
        -replace '&#x2019;', "'" `
        -replace '&#x2013;', '-' `
        -replace '&#x2014;', '--' `
        -replace '\s+', ' '
    return $text.Trim()
}

# ============================================================
# Parse Format Q: Q{n}. format with (A)(B)(C)(D)
# Handles: PENG 1-3, PENG 4-6, PENG 7-15, PE files
# ============================================================
function Parse-FormatQ($text, $subject, $sourceFile) {
    $questions = @()
    $answerMap = @{}
    $explanationMap = @{}

    # --- Strategy: Parse ALL Q{n}. blocks, categorize by content ---
    # Question: Q{n}. text (A) opt (B) opt (C) opt (D) opt
    # Answer type 1: Q{n}. [checkmark] Answer: (X) text Explanation: ...
    # Answer type 2: Q{n}. (X) correct_text explanation

    $allBlocks = [regex]::Matches($text, 'Q(\d+)\.\s+((?:(?!Q\d+\.).)+)')

    foreach ($qm in $allBlocks) {
        $num = [int]$qm.Groups[1].Value
        $body = $qm.Groups[2].Value.Trim()

        # Skip variant questions
        if ($body -match '\(Variant') { continue }

        # Detect answer block type 1: starts with "Answer:" or checkmark + "Answer:"
        if ($body -match '^(?:[✔✓]\s*)?Answer:\s*\(([A-D])\)') {
            $m = [regex]::Match($body, '^(?:[✔✓]\s*)?Answer:\s*\(([A-D])\)\s*(.*?)(?:\s*Explanation:\s*(.*))?$')
            if ($m.Success -and -not $answerMap.ContainsKey($num)) {
                $answerMap[$num] = $m.Groups[1].Value
                $exp = if ($m.Groups[3].Success -and $m.Groups[3].Value) { $m.Groups[3].Value } else { $m.Groups[2].Value }
                $exp = $exp -replace '\(This is a variant.*?\)', '' -replace '\s+', ' '
                $explanationMap[$num] = $exp.Trim()
            }
            continue
        }

        # Detect answer block type 2: starts with (X) followed by text (no other options)
        if ($body -match '^\([A-D]\)\s+[A-Z]' -and $body -notmatch '\(B\)') {
            $m = [regex]::Match($body, '^\(([A-D])\)\s+(.+)$')
            if ($m.Success -and -not $answerMap.ContainsKey($num)) {
                $answerMap[$num] = $m.Groups[1].Value
                $explanationMap[$num] = $m.Groups[2].Value.Trim()
            }
            continue
        }

        # Regular question block: must have (A) (B) (C) (D)
        $optM = [regex]::Match($body, '^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.+?)$')
        if (-not $optM.Success) { continue }

        $qText = $optM.Groups[1].Value.Trim()
        $optA  = $optM.Groups[2].Value.Trim()
        $optB  = $optM.Groups[3].Value.Trim()
        $optC  = $optM.Groups[4].Value.Trim()
        $optD  = ($optM.Groups[5].Value -replace 'Q\d+\..*', '' -replace '[✔✓].*', '').Trim()

        if ($qText.Length -lt 5 -or $optA.Length -lt 1) { continue }

        $questions += [PSCustomObject]@{
            num      = $num
            question = $qText
            optA     = $optA; optB = $optB; optC = $optC; optD = $optD
        }
    }

    # If sequential answers not yet extracted, try sequential pattern
    if ($answerMap.Count -lt 5) {
        $seqMs = [regex]::Matches($text, '(?:[✔✓]\s*)?Answer:\s*\(([A-D])\)')
        $seqQ = 1
        foreach ($m in $seqMs) {
            if (-not $answerMap.ContainsKey($seqQ)) { $answerMap[$seqQ] = $m.Groups[1].Value }
            $seqQ++
        }
    }

    # --- Extract Chapter info ---
    # Match "CHAPTER N: TITLE Questions S-E" or "CHAPTER N: TITLE — M MCQs" separately
    $chapterRanges = @()
    # First: find all "CHAPTER N:" positions and titles
    $chMs = [regex]::Matches($text, 'CHAPTER\s+(\d+)[:\s]+([A-Z][^\n]+?)(?=\s+Questions\s+\d|\s+Q\d+\.|$)')
    foreach ($cm in $chMs) {
        $chNum = [int]$cm.Groups[1].Value
        # Clean title: remove trailing MCQ count and dashes
        $chTitleLocal = ($cm.Groups[2].Value -replace '\s*[–—-]\s*\d+\s*MCQs.*$', '' -replace '\s+', ' ').Trim()
        $chapterRanges += [PSCustomObject]@{ Chapter=$chNum; Title=$chTitleLocal; Start=0; End=0 }
    }
    # Match "Questions N–M" patterns and assign to chapters in order
    $rMs = [regex]::Matches($text, 'Questions\s+(\d+)\s*[–—-]\s*(\d+)')
    $rIdx = 0
    foreach ($rm in $rMs) {
        if ($rIdx -lt $chapterRanges.Count) {
            $chapterRanges[$rIdx].Start = [int]$rm.Groups[1].Value
            $chapterRanges[$rIdx].End   = [int]$rm.Groups[2].Value
            $rIdx++
        }
    }

    function Get-Ch($n) {
        foreach ($r in $chapterRanges) {
            if ($r.Start -gt 0 -and $n -ge $r.Start -and $n -le $r.End) { return $r }
        }
        return $null
    }

    # Deduplicate questions, add chapter + answer info
    $seen = @{}
    $result = @()
    foreach ($q in $questions) {
        $key = $q.question.ToLower().Substring(0, [Math]::Min(50, $q.question.Length))
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true

        $ch = Get-Ch $q.num
        $result += [PSCustomObject]@{
            id           = ''
            question     = $q.question
            options      = [PSCustomObject]@{ A=$q.optA; B=$q.optB; C=$q.optC; D=$q.optD }
            answer       = if ($answerMap.ContainsKey($q.num)) { $answerMap[$q.num] } else { $null }
            explanation  = if ($explanationMap.ContainsKey($q.num)) { ($explanationMap[$q.num]).Trim() } else { $null }
            subject      = $subject
            chapter      = if ($ch) { $ch.Chapter } else { $null }
            chapterTitle = if ($ch) { $ch.Title } else { $null }
            source       = [System.IO.Path]::GetFileNameWithoutExtension($sourceFile)
        }
    }
    return $result
}

# ============================================================
# Parse Format Numbered: "N. text A) B) C) D)" style
# Answer: "N. Answer: X Explanation: ..."
# Used by: PENG 16-30
# ============================================================
function Parse-FormatNumbered($text, $subject, $sourceFile) {
    $questions = @()
    $globalSeen = @{}

    # Find actual chapter content starts: "Chapter N: Title N. question text"
    # Distinguish from TOC entries by requiring a question number immediately after title
    $chapHeaderPositions = @()
    $chapMs = [regex]::Matches($text, 'Chapter\s+(\d+):\s+([A-Za-z][^.]+?)\s+1\.\s+[A-Z]')
    foreach ($cm in $chapMs) {
        # Extract just the title (before the " 1. ")
        $fullMatch = $cm.Value
        $titleEnd = $fullMatch.IndexOf(' 1. ')
        $title = $fullMatch.Substring("Chapter $($cm.Groups[1].Value): ".Length, $titleEnd - "Chapter $($cm.Groups[1].Value): ".Length).Trim()
        $chapHeaderPositions += [PSCustomObject]@{
            Index   = $cm.Index
            Chapter = [int]$cm.Groups[1].Value
            Title   = $title -replace '\s+', ' '
        }
    }

    # Find each chapter's question block and answer block
    for ($i = 0; $i -lt $chapHeaderPositions.Count; $i++) {
        $chapInfo = $chapHeaderPositions[$i]
        $chapStart = $chapInfo.Index
        $chapEnd = if ($i + 1 -lt $chapHeaderPositions.Count) { $chapHeaderPositions[$i + 1].Index } else { $text.Length }
        $chapText = $text.Substring($chapStart, $chapEnd - $chapStart)

        # Split chapter text into question section and answer section
        $ansIdx = $chapText.IndexOf('Answer: A')
        if ($ansIdx -lt 0) { $ansIdx = $chapText.IndexOf('Answer: B') }
        if ($ansIdx -lt 0) { $ansIdx = $chapText.IndexOf('Answer: C') }
        if ($ansIdx -lt 0) { $ansIdx = $chapText.IndexOf('Answer: D') }

        # More robust: find first occurrence of "N. Answer: X"
        $ansM = [regex]::Match($chapText, '\d+\.\s+Answer:\s+[A-D]')
        if ($ansM.Success -and ($ansIdx -lt 0 -or $ansM.Index -lt $ansIdx)) {
            $ansIdx = $ansM.Index
        }

        $qSection = if ($ansIdx -gt 0) { $chapText.Substring(0, $ansIdx) } else { $chapText }
        $aSection = if ($ansIdx -gt 0) { $chapText.Substring($ansIdx) } else { "" }

        # Parse answers for this chapter
        $chapAnswerMap = @{}
        $chapExpMap = @{}

        # Pattern: "N. Answer: X Explanation: text" OR "Answer: X Explanation: text"
        $aMsQ = [regex]::Matches($aSection, '(\d+)\.\s+Answer:\s+([A-D])(?:\s+Explanation:\s*(.*?))?(?=\d+\.\s+Answer:|$)')
        foreach ($m in $aMsQ) {
            $chapAnswerMap[[int]$m.Groups[1].Value] = $m.Groups[2].Value
            $chapExpMap[[int]$m.Groups[1].Value] = $m.Groups[3].Value.Trim()
        }

        # Fallback: sequential
        if ($chapAnswerMap.Count -lt 5 -and $aSection.Length -gt 0) {
            $seqMs = [regex]::Matches($aSection, 'Answer:\s+([A-D])')
            $n = 1
            foreach ($m in $seqMs) {
                if (-not $chapAnswerMap.ContainsKey($n)) { $chapAnswerMap[$n] = $m.Groups[1].Value }
                $n++
            }
        }

        # Parse questions: "N. text A) opt B) opt C) opt D) opt"
        $qMs = [regex]::Matches($qSection, '(\d+)\.\s+((?:(?!\d+\.).)+)')
        foreach ($qm in $qMs) {
            $localN = [int]$qm.Groups[1].Value
            $body = $qm.Groups[2].Value.Trim()
            if ($body -match '^Answer:') { continue }

            # Options format: A) ... B) ... C) ... D) ...
            $optM = [regex]::Match($body, '^(.*?)\s+A\)\s*(.*?)\s+B\)\s*(.*?)\s+C\)\s*(.*?)\s+D\)\s*(.+?)$')
            if (-not $optM.Success) { continue }

            $qText = $optM.Groups[1].Value.Trim()
            $optA  = $optM.Groups[2].Value.Trim()
            $optB  = $optM.Groups[3].Value.Trim()
            $optC  = $optM.Groups[4].Value.Trim()
            $optD  = $optM.Groups[5].Value.Trim() -replace '\d+\.\s.+', '' -replace 'Answer:.*', ''
            $optD  = $optD.Trim()

            if ($qText.Length -lt 5) { continue }

            $key = $qText.ToLower().Substring(0, [Math]::Min(50, $qText.Length))
            if ($globalSeen.ContainsKey($key)) { continue }
            $globalSeen[$key] = $true

            $questions += [PSCustomObject]@{
                id           = ''
                question     = $qText
                options      = [PSCustomObject]@{ A=$optA; B=$optB; C=$optC; D=$optD }
                answer       = if ($chapAnswerMap.ContainsKey($localN)) { $chapAnswerMap[$localN] } else { $null }
                explanation  = if ($chapExpMap.ContainsKey($localN)) { $chapExpMap[$localN] } else { $null }
                subject      = $subject
                chapter      = $chapInfo.Chapter
                chapterTitle = $chapInfo.Title.ToUpper()
                source       = [System.IO.Path]::GetFileNameWithoutExtension($sourceFile)
            }
        }
    }
    return $questions
}

# ============================================================
# Main
# ============================================================
$files = @(
    @{ File="PENG_MCQ_Chapters_1-3.docx";                Subject="PENG";              Format="Q" }
    @{ File="PENG_MCQ_Chapters_4-6.docx";                Subject="PENG";              Format="Q" }
    @{ File="PENG_MCQ_Chapters_7-15.docx";               Subject="PENG";              Format="Q" }
    @{ File="PENG_MCQ_Chapters_16-30.docx";              Subject="PENG";              Format="Numbered" }
    @{ File="Power_Electronics_MCQ_With_Answers.docx";   Subject="Power Electronics"; Format="Q" }
    @{ File="Power_Electronics_MCQ_Extended_Ch4-10.docx";Subject="Power Electronics"; Format="Q" }
)

$allQuestions = @()
$globalSeen = @{}
$idCounter = 1

foreach ($f in $files) {
    $filePath = Join-Path $dataDir $f.File
    Write-Host "Processing $($f.File)..." -ForegroundColor Cyan

    try {
        $text = Get-DocxText $filePath
        $qs = if ($f.Format -eq "Numbered") { Parse-FormatNumbered $text $f.Subject $filePath } else { Parse-FormatQ $text $f.Subject $filePath }
        Write-Host "  -> $($qs.Count) questions" -ForegroundColor Green

        foreach ($q in $qs) {
            $key = $q.question.ToLower().Substring(0, [Math]::Min(50, $q.question.Length))
            if (-not $globalSeen.ContainsKey($key)) {
                $globalSeen[$key] = $true
                $q.id = "q$idCounter"
                $idCounter++
                $allQuestions += $q
            }
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    }
}

Write-Host "`nTotal unique questions: $($allQuestions.Count)" -ForegroundColor Yellow
$withAnswers = ($allQuestions | Where-Object { $_.answer -ne $null }).Count
Write-Host "  With answers: $withAnswers" -ForegroundColor Green
Write-Host "  Without answers: $($allQuestions.Count - $withAnswers)" -ForegroundColor Yellow

# Write JSON
$json = $allQuestions | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText((Join-Path $outDir "questions.json"), $json, [System.Text.Encoding]::UTF8)

# Build metadata
$chapMap = @{}
foreach ($q in $allQuestions) {
    $chKey = "$($q.subject)|$($q.chapter)|$($q.chapterTitle)"
    if (-not $chapMap.ContainsKey($chKey)) {
        $chapMap[$chKey] = [PSCustomObject]@{
            subject = $q.subject; chapter = $q.chapter
            chapterTitle = $q.chapterTitle; total = 0; withAnswers = 0
        }
    }
    $chapMap[$chKey].total++
    if ($q.answer) { $chapMap[$chKey].withAnswers++ }
}

$metadata = [PSCustomObject]@{
    totalQuestions = $allQuestions.Count
    withAnswers = $withAnswers
    chapters = @($chapMap.Values | Sort-Object subject, chapter)
}
$metaJson = $metadata | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $outDir "metadata.json"), $metaJson, [System.Text.Encoding]::UTF8)

Write-Host "Written: questions.json, metadata.json" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Magenta
