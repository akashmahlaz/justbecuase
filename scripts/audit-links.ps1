$validBases = @(
  'about','admin','auth','blog','changelog','checkout','contact',
  'for-ngos','for-volunteers','gate','jobs','marketing','ngo','ngos',
  'pricing','privacy','projects','terms','volunteer','volunteers',
  'api','_next','dictionaries','sitemap.xml','robots.txt',
  'manifest.webmanifest','favicon.ico','icon.svg','og-image.png',
  'logo-main.png','dashboard','messages','notifications','settings',
  'profile','onboarding','find-talent','post-project','impact',
  'opportunities','applications','referrals','saved-projects'
)
$results = New-Object System.Collections.ArrayList
$files = Get-ChildItem -Recurse -Include '*.tsx','*.ts' -Path 'app','components' -ErrorAction SilentlyContinue
foreach ($f in $files) {
  $hits = Select-String -LiteralPath $f.FullName -Pattern 'href=["''](/[a-zA-Z][a-zA-Z0-9_-]*)' -AllMatches
  foreach ($lm in $hits) {
    foreach ($mm in $lm.Matches) {
      $h = $mm.Groups[1].Value
      $base = ($h -replace '^/','' -split '/')[0]
      if ($validBases -notcontains $base) {
        [void]$results.Add("$($f.FullName.Replace($PWD.Path + '\','')):$($lm.LineNumber): $h")
      }
    }
  }
}
$results | Sort-Object -Unique
