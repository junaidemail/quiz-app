Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$sourceDir = "E:\VSCode\Data\16-Elec-A1 Circuits"
$outDir    = "E:\VSCode\Quiz App\quiz-app\public\data"
$subject   = "16-Elec-A1 Circuits"

$CHAPTER_TITLES = @{
    1  = "Basic Concepts and Circuit Variables"
    2  = "Circuit Elements"
    3  = "Simple Resistive Circuits"
    6  = "Inductance, Capacitance, and Mutual Inductance"
    8  = "Natural and Step Responses of RLC Circuits"
    9  = "Sinusoidal Steady-State Analysis"
    10 = "Sinusoidal Steady-State Power Calculations"
    11 = "Balanced Three-Phase Circuits"
    12 = "Introduction to the Laplace Transform"
    13 = "The Laplace Transform in Circuit Analysis"
    14 = "Introduction to Frequency Selective Circuits"
    15 = "Active Filter Circuits"
    16 = "Fourier Series"
    17 = "The Fourier Transform"
    18 = "Two-Port Circuits"
    19 = "Magnetically Coupled Coils and Ideal Transformers"
}

function Get-DocxText($filePath) {
    $zip    = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    $entry  = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $content = $reader.ReadToEnd()
    $reader.Close(); $zip.Dispose()
    return ($content `
        -replace '<[^>]+>',  ' ' `
        -replace '&amp;',    '&' `
        -replace '&apos;',   "'" `
        -replace '&lt;',     '<' `
        -replace '&gt;',     '>' `
        -replace '&quot;',   '"' `
        -replace '&#x2019;', "'" `
        -replace '&#x2013;', '-' `
        -replace '&#x2014;', '--' `
        -replace ([char]0x2013), '-' `
        -replace ([char]0x2014), '--' `
        -replace '\s+',      ' ').Trim()
}

function Read-ChapterQuestions($rawText, $ch) {
    $chTitle = $CHAPTER_TITLES[$ch]

    # Remove S3 upload markers
    $text = $rawText `
        -replace '\[ ppl-ai-file-upload\.s3\.amazonaws \] ', '' `
        -replace '\s+', ' '

    # --- Locate question section start and answer section start ---
    # We look for Q{ch}.1 occurrences and classify each as:
    #   questions: followed by actual MCQ content (has A. B. C. D. options)
    #   answers:   followed by answer key content
    $qSectionStart = -1
    $aSectionStart = -1

    $q1Matches = [regex]::Matches($text, "Q$ch\.1 ")
    foreach ($m in $q1Matches) {
        $after = $text.Substring($m.Index + $m.Length, [Math]::Min(350, $text.Length - $m.Index - $m.Length))

        # Identify question section: has A. B. C. D. option markers
        if ($qSectionStart -lt 0 -and ($after -match '\bA\.\s') -and ($after -match '\bB\.\s')) {
            $qSectionStart = $m.Index
        }

        # Identify answer section:
        #   Arrow format (ch1-3): non-ASCII arrow char + letter + parenthesis
        #   Letter format:        single [A-D] then space then word
        #   Correct Answer format: "- Correct Answer:"
        if ($aSectionStart -lt 0 -and $qSectionStart -ge 0 -and $m.Index -ne $qSectionStart) {
            $isArrowFmt    = $after -match '^[^\x00-\x7F]\s*[A-D]\s+\('
            $isLetterFmt   = $after -match '^[A-D]\s+\w' -and ($after -notmatch '\bA\.\s.*\bB\.\s')
            $isCorrectFmt  = $after -match '^.{0,4}Correct Answer:'
            if ($isArrowFmt -or $isLetterFmt -or $isCorrectFmt) {
                $aSectionStart = $m.Index
            }
        }
    }

    if ($qSectionStart -lt 0) {
        Write-Host "  No question section found for chapter $ch" -ForegroundColor Yellow
        return @()
    }

    $qEnd     = if ($aSectionStart -gt $qSectionStart) { $aSectionStart } else { $text.Length }
    $qSection = $text.Substring($qSectionStart, $qEnd - $qSectionStart)
    $aSection = if ($aSectionStart -gt 0) { $text.Substring($aSectionStart) } else { '' }

    # --- Parse answers ---
    $ansMap = @{}
    $expMap = @{}

    if ($aSection.Length -gt 5) {
        $aBlocks = [regex]::Matches($aSection, "Q$ch\.(\d+)\s+(.*?)(?=Q$ch\.\d+|$)")
        foreach ($ab in $aBlocks) {
            $num  = [int]$ab.Groups[1].Value
            $body = $ab.Groups[2].Value.Trim()

            # Format 1: arrow char + letter + (optional text) explanation
            # The arrow is a non-ASCII char (U+2192). Match any non-ASCII prefix.
            $m1 = [regex]::Match($body, '^[^\x00-\x7F]\s*([A-D])\s+\(([^)]*)\)\s*(.*)')
            if ($m1.Success) {
                $ansMap[$num] = $m1.Groups[1].Value
                $rawExp = if ($m1.Groups[3].Value.Trim().Length -gt 0) { $m1.Groups[3].Value.Trim() } else { $m1.Groups[2].Value.Trim() }
                $expMap[$num] = $rawExp
                continue
            }

            # Format 2: "-- Correct Answer: C explanation" (em-dash variant)
            $m2 = [regex]::Match($body, '^.{0,4}Correct Answer:\s*([A-D])\s+(.*)')
            if ($m2.Success) {
                $ansMap[$num] = $m2.Groups[1].Value
                $expMap[$num] = $m2.Groups[2].Value.Trim()
                continue
            }

            # Format 3: "A explanation text" (letter immediately after Q#)
            $m3 = [regex]::Match($body, '^([A-D])\s+(.+)')
            if ($m3.Success) {
                $afterLetter = $m3.Groups[2].Value
                # Skip if it looks like a full question block (has multiple options)
                if ($afterLetter -match '\bA\.\s' -and $afterLetter -match '\bB\.\s') { continue }
                $ansMap[$num] = $m3.Groups[1].Value
                $expMap[$num] = $afterLetter.Trim()
                continue
            }
        }
    }

    # --- Parse questions ---
    $result  = @()
    $qBlocks = [regex]::Matches($qSection, "Q$ch\.(\d+)\s+(.*?)(?=Q$ch\.\d+|$)")

    foreach ($qb in $qBlocks) {
        $num  = [int]$qb.Groups[1].Value
        $body = ($qb.Groups[2].Value -replace 'C\s+\.\s+', 'C. ' -replace '\s+', ' ').Trim()

        # Skip blocks that are answer-format, not question-format
        if ($body -match '^[^\x00-\x7F]') { continue }    # starts with arrow
        if ($body -match '^-\s+Correct') { continue }  # starts with "- Correct"
        if ($body -match '^[A-D]\s+\w' -and $body -notmatch '\bA\.\s') { continue }  # bare letter answer

        # Parse options: "question text A. optA B. optB C. optC D. optD"
        $optM = [regex]::Match($body, '^(.*?)\s+A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.+?)$')
        if (-not $optM.Success) { continue }

        $qText = $optM.Groups[1].Value.Trim()
        $optA  = $optM.Groups[2].Value.Trim()
        $optB  = $optM.Groups[3].Value.Trim()
        $optC  = $optM.Groups[4].Value.Trim()
        $optD  = ($optM.Groups[5].Value -replace 'Q\d+\..*$', '').Trim()

        if ($qText.Length -lt 4 -or $optA.Length -lt 1) { continue }

        $ans = if ($ansMap.ContainsKey($num)) { $ansMap[$num] } else { $null }
        $exp = if ($expMap.ContainsKey($num) -and $expMap[$num].Length -gt 2) { $expMap[$num] } else { $null }

        $result += [PSCustomObject]@{
            id           = ''
            question     = $qText
            options      = [PSCustomObject]@{ A=$optA; B=$optB; C=$optC; D=$optD }
            answer       = $ans
            explanation  = $exp
            subject      = $subject
            chapter      = $ch
            chapterTitle = $chTitle
            source       = "16-Elec-A1"
        }
    }

    return $result
}

# ============================================================
# Main
# ============================================================
$allQuestions = @()
$idCounter    = 1
$seen         = @{}

$files = Get-ChildItem "$sourceDir\*.docx" | Sort-Object {
    if ($_.Name -match '(\d+)') { [int]$Matches[1] } else { 999 }
}

foreach ($f in $files) {
    $chNum = if ($f.Name -match '(\d+)') { [int]$Matches[1] } else { $null }
    if (-not $chNum) { Write-Host "Skipping (no chapter number): $($f.Name)" -ForegroundColor Yellow; continue }

    Write-Host "Processing Chapter $chNum..." -ForegroundColor Cyan

    try {
        $text = Get-DocxText $f.FullName
        $qs   = Read-ChapterQuestions $text $chNum

        $withAns = ($qs | Where-Object { $_.answer }).Count
        Write-Host "  -> $($qs.Count) questions, $withAns with answers" -ForegroundColor Green

        foreach ($q in $qs) {
            $key = $q.question.ToLower().Substring(0, [Math]::Min(50, $q.question.Length))
            if (-not $seen.ContainsKey($key)) {
                $seen[$key] = $true
                $q.id = "a1_q$idCounter"
                $idCounter++
                $allQuestions += $q
            }
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    }
}

Write-Host ""
Write-Host "Total unique questions: $($allQuestions.Count)" -ForegroundColor Yellow
$withAnswers = ($allQuestions | Where-Object { $_.answer -ne $null }).Count
Write-Host "  With answers:    $withAnswers" -ForegroundColor Green
Write-Host "  Without answers: $($allQuestions.Count - $withAnswers)" -ForegroundColor Red

Write-Host ""
Write-Host "Chapter breakdown:" -ForegroundColor Cyan
$allQuestions | Group-Object chapter | Sort-Object { [int]$_.Name } | ForEach-Object {
    $wA = ($_.Group | Where-Object { $_.answer }).Count
    Write-Host ("  Ch" + $_.Name + " - " + $CHAPTER_TITLES[[int]$_.Name] + ": " + $_.Count + " Qs (" + $wA + " with answers)")
}

# Write questions.json
$json = $allQuestions | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText((Join-Path $outDir "questions.json"), $json, [System.Text.Encoding]::UTF8)
Write-Host ""
Write-Host "Written: questions.json" -ForegroundColor Green

# Write metadata.json
$subjectMap = [ordered]@{}
foreach ($q in $allQuestions) {
    if (-not $subjectMap.Contains($q.subject)) { $subjectMap[$q.subject] = [ordered]@{} }
    $chKey = if ($q.chapterTitle) { "Chapter " + $q.chapter + ": " + $q.chapterTitle } else { "General" }
    if (-not $subjectMap[$q.subject].Contains($chKey)) { $subjectMap[$q.subject][$chKey] = 0 }
    $subjectMap[$q.subject][$chKey]++
}

$metadata = [PSCustomObject]@{
    totalQuestions = $allQuestions.Count
    subjects       = $subjectMap
}
$metaJson = $metadata | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $outDir "metadata.json"), $metaJson, [System.Text.Encoding]::UTF8)
Write-Host "Written: metadata.json" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Magenta
