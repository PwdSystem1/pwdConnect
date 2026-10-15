@echo off
setlocal
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe goto missing
.venv\Scripts\python.exe server.py
pause
exit /b
:missing
echo Run setup-local-voice.cmd first.
pause
exit /b 1
