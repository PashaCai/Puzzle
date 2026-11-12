@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
  start "" "http://127.0.0.1:4173"
  node server.cjs
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    start "" "http://127.0.0.1:4173"
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.cjs
  ) else (
    echo Node.js is required. Alternatively use VS Code Live Server.
    pause
  )
)
