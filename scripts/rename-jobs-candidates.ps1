# Safe terminology rename: only inside string literals, only for capitalized
# Opportunity/Opportunities and Impact Agent/Impact Agents, plus user-facing
# lowercase plurals. Skips strings that look like URL paths, import paths, or
# short identifier-style keys.
#
# Run from repo root.

param([switch]$DryRun)

$pairs = @(
  @('Opportunities','Jobs'),
  @('Opportunity','Job'),
  @('Impact Agents','Candidates (Impact Agents)'),
  @('Impact Agent','Candidate (Impact Agent)')
)

# Lowercase replacements only applied if string contains a space (user text,
# not an identifier or a URL slug).
$pairsLower = @(
  @('opportunities','jobs'),
  @('opportunity','job'),
  @('impact agents','candidates (impact agents)'),
  @('impact agent','candidate (impact agent)')
)

function Should-SkipString($content) {
  if ($content.Length -eq 0) { return $true }
  if ($content -match '^/') { return $true }              # route path
  if ($content -match '^\./') { return $true }
  if ($content -match '^\.\./') { return $true }
  if ($content -match '^@/') { return $true }             # alias import
  if ($content -match '^https?://') { return $true }
  if ($content -match '^[a-z][A-Za-z0-9_]*$') { return $true } # bare identifier
  # CSS / DOM selectors
  if ($content -match '^[\.\#\[]') { return $true }
  if ($content -match '\[data-') { return $true }
  if ($content -match '\bdata-[a-z\-]+') { return $true }
  return $false
}

function Replace-InString($s) {
  # Only replace inside prose-like strings (must contain a space).
  # Single-word strings are almost always identifiers, type literals, MongoDB
  # collection names, role tags, etc., and must NOT be touched.
  if ($s -notmatch ' ') { return $s }
  $orig = $s
  foreach ($p in $pairs) {
    $s = [regex]::Replace($s, ('\b' + [regex]::Escape($p[0]) + '\b'), $p[1])
  }
  foreach ($p in $pairsLower) {
    $s = [regex]::Replace($s, ('\b' + [regex]::Escape($p[0]) + '\b'), $p[1])
  }
  return $s
}

$files = Get-ChildItem -Recurse -File -Include *.tsx,*.ts -Path app,components,lib,hooks |
  Where-Object {
    $rel = $_.FullName.Substring((Get-Location).Path.Length + 1).Replace('\','/')
    # Exclude internals: scraper, search/index/sync, SEO keywords, raw API mappings,
    # and unused mock data — these contain CSS selectors, type literals,
    # search synonyms, URL slugs, etc. that must not be touched.
    -not (
      $rel -like 'lib/scraper/*' -or
      $rel -like 'lib/algolia.ts' -or
      $rel -like 'lib/seo.ts' -or
      $rel -like 'lib/search-indexes.ts' -or
      $rel -like 'lib/es-search.ts' -or
      $rel -like 'lib/es-sync.ts' -or
      $rel -like 'lib/es-indexes.ts' -or
      $rel -like 'lib/idealist-api.ts' -or
      $rel -like 'lib/reliefweb-api.ts' -or
      $rel -like 'lib/data.ts' -or
      $rel -like 'lib/skills-data.tsx' -or
      $rel -like 'lib/logo-resolver.ts' -or
      $rel -like 'lib/strip-markdown.ts' -or
      $rel -like 'lib/types/*' -or
      $rel -like 'app/api/*'
    )
  }
$totalChanged = 0
$totalReplacements = 0

foreach ($f in $files) {
  $orig = [System.IO.File]::ReadAllText($f.FullName)
  $count = 0

  # Match "..." and '...' string literals (no escaped quotes inside for simplicity)
  $regex = [regex]'(?<!\\)("([^"\\]|\\.)*"|''([^''\\]|\\.)*'')'

  $new = $regex.Replace($orig, {
    param($m)
    $full = $m.Value
    $quote = $full.Substring(0,1)
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
    $totalChanged++
    $totalReplacements += $count
    if (-not $DryRun) {
      [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding $false))
    }
    Write-Host ("[{0}] {1}" -f $count, $f.FullName.Substring((Get-Location).Path.Length + 1))
  }
}

Write-Host ""
Write-Host ("Files changed: {0}" -f $totalChanged)
Write-Host ("Total string-literal replacements: {0}" -f $totalReplacements)
if ($DryRun) { Write-Host "(Dry run - no files written)" }
