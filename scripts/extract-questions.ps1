Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$dataDir = "e:\VSCode\Data"
$outDir  = "e:\VSCode\Quiz App\quiz-app\public\data"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ============================================================
# Hardcoded chapter definitions per file
# Start/End = local question number (Q1..QN) within that file
# ============================================================
$FILE_CHAPTERS = @{
    "PENG_MCQ_Chapters_1-3" = @(
        @{ Num=1;  Title="Units";                                                          Start=1;   End=70  }
        @{ Num=2;  Title="Fundamentals of Electricity, Magnetism, and Circuits";           Start=71;  End=140 }
        @{ Num=3;  Title="Fundamentals of Mechanics and Heat";                             Start=141; End=210 }
    )
    "PENG_MCQ_Chapters_4-6" = @(
        @{ Num=4;  Title="DC Generators";                                                  Start=1;   End=70  }
        @{ Num=5;  Title="Direct-Current Motors";                                          Start=71;  End=140 }
        @{ Num=6;  Title="Efficiency and Heating of Electrical Machines";                  Start=141; End=210 }
    )
    "PENG_MCQ_Chapters_7-15" = @(
        @{ Num=7;  Title="Three-Phase Induction Motors: General Properties";               Start=1;   End=70  }
        @{ Num=8;  Title="Three-Phase Induction Motors: Equivalent Circuit and Performance";Start=71; End=140 }
        @{ Num=9;  Title="The Ideal Transformer";                                          Start=141; End=210 }
        @{ Num=10; Title="The Practical Transformer";                                      Start=211; End=280 }
        @{ Num=11; Title="Special Transformers";                                           Start=281; End=350 }
        @{ Num=12; Title="Three-Phase Transformers";                                       Start=351; End=420 }
        @{ Num=13; Title="Three-Phase Induction Motors (Advanced)";                        Start=421; End=490 }
        @{ Num=14; Title="Synchronous Generators";                                         Start=491; End=560 }
        @{ Num=15; Title="Synchronous Motors";                                             Start=561; End=630 }
    )
    "PENG_MCQ_Chapters_16-30" = @(
        @{ Num=16; Title="Synchronous Generators (Advanced)";   Start=1;   End=70  }
        @{ Num=17; Title="Synchronous Motors (Advanced)";       Start=71;  End=140 }
        @{ Num=18; Title="Introduction to Finite Element Method";Start=141; End=210 }
        @{ Num=19; Title="Design of Synchronous Machines";      Start=211; End=280 }
        @{ Num=20; Title="Design of AC Induction Machines";     Start=281; End=350 }
        @{ Num=21; Title="Solid State Drives";                  Start=351; End=420 }
        @{ Num=22; Title="DC Drives";                           Start=421; End=490 }
        @{ Num=23; Title="AC Drives";                           Start=491; End=560 }
        @{ Num=24; Title="Special Topics and Case Studies";     Start=561; End=630 }
        @{ Num=25; Title="Standards and Regulations";           Start=631; End=700 }
    )
    "Power_Electronics_MCQ_With_Answers" = @(
        @{ Num=1;  Title="Power Semiconductor Devices";         Start=1;   End=70  }
        @{ Num=2;  Title="Power Converters and Rectifiers";     Start=71;  End=140 }
        @{ Num=3;  Title="Inverters, Control and Modulation";   Start=141; End=210 }
    )
    "Power_Electronics_MCQ_Extended_Ch4-10" = @(
        @{ Num=4;  Title="DC-DC Converters and Buck/Boost";     Start=1;   End=70  }
        @{ Num=5;  Title="PWM Techniques and Switching";        Start=71;  End=140 }
        @{ Num=6;  Title="Gate Drivers and Protection Circuits";Start=141; End=210 }
        @{ Num=7;  Title="EMI, Filtering, and Power Quality";   Start=211; End=280 }
        @{ Num=8;  Title="Motor Drives and Control";            Start=281; End=350 }
        @{ Num=9;  Title="Renewable Energy Converters";         Start=351; End=420 }
        @{ Num=10; Title="Thermal Management and Reliability";  Start=421; End=490 }
    )
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
        -replace '\s+',      ' ').Trim()
}

function Get-ChapterForNum($localNum, $chapDefs) {
    foreach ($c in $chapDefs) {
        if ($localNum -ge $c.Start -and $localNum -le $c.End) { return $c }
    }
    return $null
}

# Parse Format Q — each file has CHAPTER headers appearing TWICE:
# first occurrence = question blocks with (A)(B)(C)(D) options
# second occurrence = answer blocks in one of two formats
# Strategy: use 1st occurrence per chapter for questions, 2nd for answers.
function Invoke-ParseFormatQ($text, $subject, $fileKey) {
    $chapDefs = $FILE_CHAPTERS[$fileKey]
    $seen     = @{}
    $result   = @()

    # Find all CHAPTER N: header positions
    $chHeaderMs = [regex]::Matches($text, 'CHAPTER\s+(\d+)[:\s]+[A-Z]')

    # Build ordered section list: [chNum, start, end]
    $sections = @()
    for ($i = 0; $i -lt $chHeaderMs.Count; $i++) {
        $start = $chHeaderMs[$i].Index
        $end   = if ($i+1 -lt $chHeaderMs.Count) { $chHeaderMs[$i+1].Index } else { $text.Length }
        $sections += [PSCustomObject]@{ ChNum=[int]$chHeaderMs[$i].Groups[1].Value; Start=$start; End=$end }
    }

    # If no headers found, treat entire file as one un-chaptered block
    if ($sections.Count -eq 0) {
        $sections = @([PSCustomObject]@{ ChNum=$null; Start=0; End=$text.Length })
    }

    # Group sections by chapter number preserving order of first appearance.
    # 1st slice = question section, 2nd slice = answer section.
    $chapSlices = [ordered]@{}   # chNum (string) -> @{ Q = text slice; A = text slice }
    foreach ($sec in $sections) {
        $k     = "$($sec.ChNum)"
        $slice = $text.Substring($sec.Start, $sec.End - $sec.Start)
        if (-not $chapSlices.Contains($k)) {
            $chapSlices[$k] = @{ Q = $slice; A = '' }
        } else {
            $chapSlices[$k].A += ' ' + $slice
        }
    }

    # FALLBACK: Some files have no CHAPTER headers in their answer section.
    # Detect: if every aSlice is empty, find answers from full text and redistribute.
    $anyAnswerSlice = $chapSlices.Values | Where-Object { $_.A.Length -gt 0 }
    $sharedAnsMap   = $null   # used when Q numbers are continuous (no restarts)
    $sharedExpMap   = $null

    if (-not $anyAnswerSlice) {
        # Find where the answer section begins (first Q1 block containing "Answer:")
        $ansStart = -1
        $allQ1Blocks = [regex]::Matches($text, 'Q1\.\s+((?:(?!Q\d+\.).)+)')
        foreach ($qb in $allQ1Blocks) {
            if ($qb.Groups[1].Value -match 'Answer:') {
                $ansStart = $qb.Index; break
            }
        }
        if ($ansStart -gt 0) {
            $ansBlock  = $text.Substring($ansStart)
            # Detect Q1 restarts inside answer block (means chapters restart Q numbering)
            $q1RestartCount = ([regex]::Matches($ansBlock, '(?<=\s)Q1\.')).Count
            if ($q1RestartCount -ge 1) {
                # Q restarts → split answer block per chapter at each Q1 boundary
                $q1Positions = @(0) + @([regex]::Matches($ansBlock, '(?<=\s)Q1\.') | ForEach-Object { $_.Index }) + @($ansBlock.Length)
                $chapKeys = @($chapSlices.Keys)
                for ($ci = 0; $ci -lt $chapKeys.Count -and $ci -lt ($q1Positions.Count - 1); $ci++) {
                    $s = $q1Positions[$ci]; $e = $q1Positions[$ci + 1]
                    $chapSlices[$chapKeys[$ci]].A = $ansBlock.Substring($s, $e - $s)
                }
            } else {
                # Continuous Q numbers → build a SHARED global answer map used by all chapters
                $sharedAnsMap = @{}; $sharedExpMap = @{}
                $ansBlocks = [regex]::Matches($ansBlock, 'Q(\d+)\.\s+((?:(?!Q\d+\.).)+)')
                foreach ($ab in $ansBlocks) {
                    $n = [int]$ab.Groups[1].Value; $b = $ab.Groups[2].Value.Trim()
                    $m1 = [regex]::Match($b, 'Answer:\s*\(([A-D])\)\s*(.*?)(?:Explanation:\s*(.*))?$')
                    if ($m1.Success -and -not $sharedAnsMap.ContainsKey($n)) {
                        $sharedAnsMap[$n] = $m1.Groups[1].Value
                        $raw = if ($m1.Groups[3].Value) { $m1.Groups[3].Value } else { $m1.Groups[2].Value }
                        $sharedExpMap[$n] = ($raw -replace '\(This is a variant.*?\)', '' -replace '\s+', ' ').Trim()
                        continue
                    }
                    $m2 = [regex]::Match($b, '^\(([A-D])\)\s+(.+)$')
                    if ($m2.Success -and -not ($b -match '\(A\)' -and $b -match '\(B\)' -and $b -match '\(C\)' -and $b -match '\(D\)')) {
                        if (-not $sharedAnsMap.ContainsKey($n)) {
                            $sharedAnsMap[$n] = $m2.Groups[1].Value
                            $sharedExpMap[$n] = $m2.Groups[2].Value.Trim()
                        }
                    }
                }
            }
        }
    }

    foreach ($k in $chapSlices.Keys) {
        $chNum   = if ($k -ne '') { [int]$k } else { $null }
        $qSlice  = $chapSlices[$k].Q
        $aSlice  = $chapSlices[$k].A

        $chDef   = if ($chapDefs -and $chNum) { $chapDefs | Where-Object { $_.Num -eq $chNum } | Select-Object -First 1 } else { $null }
        $chTitle = if ($chDef) { $chDef.Title } else { $null }

        # ---- Extract answers from answer slice ----
        $ansMap = @{}; $expMap = @{}

        if ($aSlice.Length -gt 0) {
            $aBlocks = [regex]::Matches($aSlice, 'Q(\d+)\.\s+((?:(?!Q\d+\.).)+)')
            foreach ($ab in $aBlocks) {
                $num  = [int]$ab.Groups[1].Value
                $body = $ab.Groups[2].Value.Trim()

                # Format 1: "text ✔ Answer: (X) Explanation: text"
                $m1 = [regex]::Match($body, 'Answer:\s*\(([A-D])\)\s*(.*?)(?:Explanation:\s*(.*))?$')
                if ($m1.Success -and -not $ansMap.ContainsKey($num)) {
                    $ansMap[$num] = $m1.Groups[1].Value
                    $raw = if ($m1.Groups[3].Value) { $m1.Groups[3].Value } else { $m1.Groups[2].Value }
                    $expMap[$num] = ($raw -replace '\(This is a variant.*?\)', '' -replace '\s+', ' ').Trim()
                    continue
                }

                # Format 2: "(X) correct_text explanation" — body starts with "(X)"
                # Check it doesn't contain all four options (which would make it a question)
                $m2 = [regex]::Match($body, '^\(([A-D])\)\s+(.+)$')
                if ($m2.Success -and -not ($body -match '\(A\)' -and $body -match '\(B\)' -and $body -match '\(C\)' -and $body -match '\(D\)')) {
                    if (-not $ansMap.ContainsKey($num)) {
                        $ansMap[$num] = $m2.Groups[1].Value
                        $expMap[$num] = $m2.Groups[2].Value.Trim()
                    }
                }
            }
        }

        # Fallback: scan entire file for sequential Answer: (X) if nothing found
        if ($ansMap.Count -lt 3 -and $aSlice.Length -gt 0) {
            $seqMs = [regex]::Matches($aSlice, '(?:[✔✓]\s*)?Answer:\s*\(([A-D])\)')
            $n = 1
            foreach ($m in $seqMs) {
                if (-not $ansMap.ContainsKey($n)) { $ansMap[$n] = $m.Groups[1].Value }
                $n++
            }
        }

        # ---- Extract questions from question slice ----
        $rawQs = @()
        $qBlocks = [regex]::Matches($qSlice, 'Q(\d+)\.\s+((?:(?!Q\d+\.).)+)')
        foreach ($qm in $qBlocks) {
            $num  = [int]$qm.Groups[1].Value
            $body = $qm.Groups[2].Value.Trim()
            if ($body -match '\(Variant') { continue }
            # Skip any stray answer-format blocks that sneak into question slice
            if ($body -match 'Answer:\s*\(([A-D])\)') { continue }
            if ($body -match '^\([A-D]\)\s+\w' -and -not ($body -match '\(A\)' -and $body -match '\(C\)')) { continue }

            $optM = [regex]::Match($body, '^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.+?)$')
            if (-not $optM.Success) { continue }

            $qText = $optM.Groups[1].Value.Trim()
            $optA  = $optM.Groups[2].Value.Trim()
            $optB  = $optM.Groups[3].Value.Trim()
            $optC  = $optM.Groups[4].Value.Trim()
            $optD  = ($optM.Groups[5].Value -replace 'Q\d+\..*', '' -replace '[✔✓].*', '').Trim()

            if ($qText.Length -lt 5 -or $optA.Length -lt 1) { continue }
            $rawQs += [PSCustomObject]@{ localNum=$num; question=$qText; optA=$optA; optB=$optB; optC=$optC; optD=$optD }
        }

        # ---- Build result ----
        foreach ($q in $rawQs) {
            $key = $q.question.ToLower().Substring(0, [Math]::Min(50, $q.question.Length))
            if ($seen.ContainsKey($key)) { continue }
            $seen[$key] = $true

            # Resolve answer: prefer per-chapter map, then shared global map
            $ans = if ($ansMap.ContainsKey($q.localNum)) { $ansMap[$q.localNum] }
                   elseif ($sharedAnsMap -and $sharedAnsMap.ContainsKey($q.localNum)) { $sharedAnsMap[$q.localNum] }
                   else { $null }
            $exp = if ($expMap.ContainsKey($q.localNum)) { $expMap[$q.localNum] }
                   elseif ($sharedExpMap -and $sharedExpMap.ContainsKey($q.localNum)) { $sharedExpMap[$q.localNum] }
                   else { $null }

            $result += [PSCustomObject]@{
                id           = ''
                question     = $q.question
                options      = [PSCustomObject]@{ A=$q.optA; B=$q.optB; C=$q.optC; D=$q.optD }
                answer       = $ans
                explanation  = $exp
                subject      = $subject
                chapter      = $chNum
                chapterTitle = $chTitle
                source       = $fileKey
            }
        }
    }
    return $result
}

# ============================================================
# FORMAT NUMBERED: "N. text A) B) C) D)"  (PENG 16-30)
# Answers: "N. Answer: X Explanation: …"
# ============================================================
function Invoke-ParseFormatNumbered($text, $subject, $fileKey) {
    $chapDefs   = $FILE_CHAPTERS[$fileKey]
    $globalSeen = @{}
    $result     = @()

    # Find actual chapter content sections: "Chapter N: Title 1. Question…"
    $chapMs = [regex]::Matches($text, 'Chapter\s+(\d+):\s+([A-Za-z][^.]+?)\s+1\.\s+[A-Z]')

    $chapHeaderPositions = @()
    foreach ($cm in $chapMs) {
        $fullMatch = $cm.Value
        $titleEnd  = $fullMatch.IndexOf(' 1. ')
        $prefix    = "Chapter $($cm.Groups[1].Value): "
        $title     = $fullMatch.Substring($prefix.Length, $titleEnd - $prefix.Length).Trim() -replace '\s+', ' '
        $chapHeaderPositions += [PSCustomObject]@{
            Index   = $cm.Index
            Chapter = [int]$cm.Groups[1].Value
            Title   = $title
        }
    }

    # Build a GLOBAL sequential answer list from the whole file.
    # PENG 16-30 puts all answers AFTER all questions with no chapter headers.
    # Pattern: "Answer: X Explanation: ..." or "N. Answer: X Explanation: ..."
    $globalAnsLetters = @()
    $globalAnsExps    = @()
    $globalAnsMs = [regex]::Matches($text, '(?:\d+\.\s+)?Answer:\s+([A-D])(?:\s+Explanation:\s*(.*?))?(?=(?:\d+\.\s+)?Answer:|Chapter\s+\d|$)')
    foreach ($m in $globalAnsMs) {
        $globalAnsLetters += $m.Groups[1].Value
        $globalAnsExps    += if ($m.Groups[2].Value) { $m.Groups[2].Value.Trim() } else { '' }
    }
    $globalAnsIdx = 0   # consumed sequentially per chapter

    for ($i = 0; $i -lt $chapHeaderPositions.Count; $i++) {
        $chapInfo  = $chapHeaderPositions[$i]
        $chapStart = $chapInfo.Index
        $chapEnd   = if ($i + 1 -lt $chapHeaderPositions.Count) { $chapHeaderPositions[$i+1].Index } else { $text.Length }
        $chapText  = $text.Substring($chapStart, $chapEnd - $chapStart)

        $ch      = if ($chapDefs) { $chapDefs | Where-Object { $_.Num -eq $chapInfo.Chapter } | Select-Object -First 1 } else { $null }
        $chTitle = if ($ch) { $ch.Title } else { $chapInfo.Title }

        # Determine question section boundary (stop at first "Answer:")
        $ansM   = [regex]::Match($chapText, '(?:\d+\.\s+)?Answer:\s+[A-D]')
        $qSection = if ($ansM.Success) { $chapText.Substring(0, $ansM.Index) } else { $chapText }

        # Extract questions
        $chapterQs = @()
        $qMs = [regex]::Matches($qSection, '\d+\.\s+((?:(?!\d+\.).)+)')
        foreach ($qm in $qMs) {
            $body   = $qm.Groups[1].Value.Trim()
            if ($body -match '^Answer:') { continue }

            $optM = [regex]::Match($body, '^(.*?)\s+A\)\s*(.*?)\s+B\)\s*(.*?)\s+C\)\s*(.*?)\s+D\)\s*(.+?)$')
            if (-not $optM.Success) { continue }

            $qText = $optM.Groups[1].Value.Trim()
            $optA  = $optM.Groups[2].Value.Trim()
            $optB  = $optM.Groups[3].Value.Trim()
            $optC  = $optM.Groups[4].Value.Trim()
            $optD  = ($optM.Groups[5].Value -replace '\d+\.\s.+', '' -replace 'Answer:.*', '').Trim()
            if ($qText.Length -lt 5) { continue }

            $key = $qText.ToLower().Substring(0, [Math]::Min(50, $qText.Length))
            if ($globalSeen.ContainsKey($key)) { continue }
            $globalSeen[$key] = $true

            $chapterQs += [PSCustomObject]@{
                qText=$qText; optA=$optA; optB=$optB; optC=$optC; optD=$optD
            }
        }

        # Assign answers sequentially from the global list
        foreach ($q in $chapterQs) {
            $ans = if ($globalAnsIdx -lt $globalAnsLetters.Count) { $globalAnsLetters[$globalAnsIdx] } else { $null }
            $exp = if ($globalAnsIdx -lt $globalAnsExps.Count)    { $globalAnsExps[$globalAnsIdx] }    else { $null }
            $globalAnsIdx++

            $result += [PSCustomObject]@{
                id           = ''
                question     = $q.qText
                options      = [PSCustomObject]@{ A=$q.optA; B=$q.optB; C=$q.optC; D=$q.optD }
                answer       = $ans
                explanation  = if ($exp) { $exp } else { $null }
                subject      = $subject
                chapter      = $chapInfo.Chapter
                chapterTitle = $chTitle
                source       = $fileKey
            }
        }
    }
    return $result
}

# ============================================================
# Main
# ============================================================
$files = @(
    @{ File="PENG_MCQ_Chapters_1-3.docx";                Subject="Power Systems and Machines"; Format="Q" }
    @{ File="PENG_MCQ_Chapters_4-6.docx";                Subject="Power Systems and Machines"; Format="Q" }
    @{ File="PENG_MCQ_Chapters_7-15.docx";               Subject="Power Systems and Machines"; Format="Q" }
    @{ File="PENG_MCQ_Chapters_16-30.docx";              Subject="Power Systems and Machines"; Format="Numbered" }
    @{ File="Power_Electronics_MCQ_With_Answers.docx";   Subject="Power Electronics";          Format="Q" }
    @{ File="Power_Electronics_MCQ_Extended_Ch4-10.docx";Subject="Power Electronics";          Format="Q" }
)

$allQuestions = @()
$globalSeen   = @{}
$idCounter    = 1

foreach ($f in $files) {
    $filePath = Join-Path $dataDir $f.File
    $fileKey  = [System.IO.Path]::GetFileNameWithoutExtension($f.File)
    Write-Host "Processing $($f.File)..." -ForegroundColor Cyan

    try {
        $text = Get-DocxText $filePath
        $qs   = if ($f.Format -eq "Numbered") {
            Invoke-ParseFormatNumbered $text $f.Subject $fileKey
        } else {
            Invoke-ParseFormatQ $text $f.Subject $fileKey
        }
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
Write-Host "  With answers:    $withAnswers" -ForegroundColor Green
Write-Host "  Without answers: $($allQuestions.Count - $withAnswers)" -ForegroundColor Yellow

# Show chapter breakdown
Write-Host "`nChapter breakdown:" -ForegroundColor Cyan
$allQuestions | Group-Object subject, chapter, chapterTitle | Sort-Object Name | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) questions"
}

# Write JSON
$json = $allQuestions | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText((Join-Path $outDir "questions.json"), $json, [System.Text.Encoding]::UTF8)
Write-Host "`nWritten: questions.json" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Magenta
