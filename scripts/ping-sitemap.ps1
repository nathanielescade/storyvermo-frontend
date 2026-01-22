# Ping Google with your sitemap URL after deploying
# Usage: .\ping-sitemap.ps1 -SitemapUrl "https://storyvermo.com/sitemap.xml"

param(
  [Parameter(Mandatory=$false)]
  [string]$SitemapUrl = "https://storyvermo.com/sitemap.xml"
)

Write-Host "Pinging Google with sitemap: $SitemapUrl"
try {
  $resp = Invoke-WebRequest -Uri "https://www.google.com/ping?sitemap=$SitemapUrl" -UseBasicParsing -TimeoutSec 30
  Write-Host "Google ping response status:" $resp.StatusCode
  if ($resp.StatusDescription) { Write-Host $resp.StatusDescription }
} catch {
  Write-Host "Ping failed:" $_.Exception.Message -ForegroundColor Red
  exit 1
}

Write-Host "Done. Consider also adding the sitemap in Google Search Console for full coverage."