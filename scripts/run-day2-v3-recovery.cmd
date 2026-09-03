@echo off
REM CTO ONLY — Day 2 V3 baseline recovery (handoff machine)
REM Run from: C:\Users\김성길\Documents\GitHub\cursor-project
setlocal
cd /d "%~dp0.."
echo === V3 Baseline Recovery (CTO) ===
git status
git branch --show-current
git rev-parse HEAD
if exist .git\MERGE_HEAD (
  echo BLOCKED: merge in progress
  exit /b 1
)
git fetch origin feature/v3-baseline-recovery
if errorlevel 1 exit /b 1
git show origin/feature/v3-baseline-recovery:scripts/handoff-recover-v3-baseline.ps1 > scripts\handoff-recover-v3-baseline.ps1
if not exist scripts\handoff-recover-v3-baseline.ps1 (
  echo BLOCKED: recovery script not fetched
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\handoff-recover-v3-baseline.ps1
exit /b %ERRORLEVEL%
