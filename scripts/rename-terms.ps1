# Rename user-facing terminology:
#   Opportunities -> Jobs
#   Opportunity   -> Job
#   Impact Agents -> Candidates
#   Impact Agent  -> Candidate
#   NGOs          -> Enterprises
#   NGO           -> Enterprise
#
# Safety rules:
#   - Only inside string literals ("..." or '...')
#   - Only strings containing a SPACE (prose, not identifiers/keys/role tags)
#   - Skip route paths, import paths, URLs, CSS selectors
#   - Skip backend/scraper/search/seo/api/types files (identifiers, type literals)
#   - Order longest -> shortest. Replacement values do NOT contain the source
#     words, so no recursive nesting can occur.

param([switch]$DryRun)

# Order matters: do plurals/longer phrases first.
$pairs = @(
  @('Opportunities', 'Jobs'),
  @('Opportunity',   'Job'),
  @('opportunities', 'jobs'),
  @('opportunity',   'job'),
  @('Impact Agents', 'Candidates'),
  @('Impact Agent',  'Candidate'),
  @('impact agents', 'candidates'),
  @('impact agent',  'candidate'),
  @('NGOs',          'Enterprises'),
  @('NGO',           'Enterprise')
  # Lowercase 'ngo' / 'ngos' are NEVER user-facing prose — they are role tags,
  # field names, URL slugs. Do not touch.
)

function Should-SkipString($content) {
  if ($content.Length -eq 0) { return $true }
  if ($content -match '^/') { return $true }
  if ($content -match '^\./') { return $true }
  if ($content -match '^\.\./') { return $true }
  if ($content -match '^@/') { return $true }
  if ($content -match '^https?://') { return $true }
  if ($content -match '^[a-z][A-Za-z0-9_]*$') { return $true }
  if ($content -match '^[\.\#\[]') { return $true }
  if ($content -match '\[data-') { return $true }
  return $false
}

function Replace-InString($s) {
  if ($s -notmatch ' ') { return $s }
  foreach ($p in $pairs) {
    # Word-boundary, case-sensitive, plain literal source.
    $s = [regex]::Replace($s, ('\b' + [regex]::Escape($p[0]) + '\b'), $p[1])
  }
  return $s
}

# Source code files
$srcFiles = Get-ChildItem -Recurse -File -Include *.tsx, *.ts -Path app, components, lib, hooks |
  Where-Object {
    $rel = $_.FullName.Substring((Get-Location).Path.Length + 1).Replace('\', '/')
    -not (
      $rel -like 'lib/scraper/*' -or
      $rel -like 'lib/algolia.ts' -or
      $rel -like 'lib/seo.ts' -or
      $rel -like 'lib/search-indexes.ts' -or
      $rel -like 'lib/es-search.ts' -or
      $rel -like 'lib/es-sync.ts' -or
      $rel -like 'lib/es-indexes.ts' -or
      $rel -like 'lib/idealist-api.ts' -or
      $rel -like 'lib/idealist-fast-fetch.ts' -or
      $rel -like 'lib/reliefweb-api.ts' -or
      $rel -like 'lib/theirstack-jobs.ts' -or
      $rel -like 'lib/theirstack-sync.ts' -or
      $rel -like 'lib/data.ts' -or
      $rel -like 'lib/skills-data.tsx' -or
      $rel -like 'lib/logo-resolver.ts' -or
      $rel -like 'lib/strip-markdown.ts' -or
      $rel -like 'lib/types/*' -or
      $rel -like 'app/api/*'
    )
  }

$totalFiles = 0
$totalReps  = 0

foreach ($f in $srcFiles) {
  $orig = [System.IO.File]::ReadAllText($f.FullName)
  $count = 0
  $regex = [regex]'("([^"\\]|\\.)*"|''([^''\\]|\\.)*'')'
  $new = $regex.Replace($orig, {
    param($m)
    $full  = $m.Value
    $quote = $full.Substring(0, 1)
    $inner = $full.Substring(1, $full.Length - 2)
    if (Should-SkipString $inner) { return $full }
    $replaced = Replace-InString $inner
    if ($replaced -ne $inner) {
      $script:count++
      return $quote + $replaced + $quote
    }
    return $full
  })
  if ($new -ne $orig) {
    $totalFiles++
    $totalReps += $count
    if (-not $DryRun) {
      [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding $false))
    }
    Write-Host ("[{0}] {1}" -f $count, $f.FullName.Substring((Get-Location).Path.Length + 1))
  }
}

# Dictionary JSON files - process whole file as text (every value is a string)
$dictFiles = Get-ChildItem -LiteralPath 'app\[lang]\dictionaries' -Filter *.json -File
foreach ($f in $dictFiles) {
  $orig = [System.IO.File]::ReadAllText($f.FullName)
  $count = 0
  $regex = [regex]'"([^"\\]|\\.)*"'
  $new = $regex.Replace($orig, {
    param($m)
    $full  = $m.Value
    $inner = $full.Substring(1, $full.Length - 2)
    if (Should-SkipString $inner) { return $full }
    $replaced = Replace-InString $inner
    if ($replaced -ne $inner) {
      $script:count++
      return '"' + $replaced + '"'
    }
    return $full
  })
  if ($new -ne $orig) {
    $totalFiles++
    $totalReps += $count
    if (-not $DryRun) {
      [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding $false))
    }
    Write-Host ("[{0}] {1}" -f $count, $f.FullName.Substring((Get-Location).Path.Length + 1))
  }
}

Write-Host ""
Write-Host ("Files changed: {0}" -f $totalFiles)
Write-Host ("Replacements:  {0}" -f $totalReps)
if ($DryRun) { Write-Host "(Dry run - no files written)" }
