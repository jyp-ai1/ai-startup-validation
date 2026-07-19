# Deploy to jyp-ai1 Vercel — run in Cursor terminal
# Project: https://vercel.com/jyp-ai1s-projects/ai-startup-validation

Write-Host "=== Step 1: Vercel login (detourdada1 / jyp-ai1) ===" -ForegroundColor Cyan
vercel logout
vercel login

Write-Host "`n=== Step 2: Link project ===" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\..\apps\web"
vercel link --yes --scope jyp-ai1s-projects --project ai-startup-validation

Write-Host "`n=== Step 3: Production deploy ===" -ForegroundColor Cyan
vercel --prod --yes

Write-Host "`n=== Done! Check: ===" -ForegroundColor Green
Write-Host "https://vercel.com/jyp-ai1s-projects/ai-startup-validation"
