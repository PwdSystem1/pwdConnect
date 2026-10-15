@echo off
setlocal
cd /d "%~dp0"
py -3.12 --version >nul 2>&1
if errorlevel 1 goto missingpython
if not exist .venv\Scripts\python.exe py -3.12 -m venv .venv
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto failed
.venv\Scripts\python.exe server.py --download
if errorlevel 1 goto failed
echo.
echo Setup complete. Run start-local-voice.cmd, then start your normal Node backend.
pause
exit /b 0
:missingpython
echo Install Python 3.12 for Windows, including the Python launcher, from python.org.
echo Then run this setup again. No Azure or payment account is needed.
pause
exit /b 1
:failed
echo.
echo Setup did not finish. Read the error above; do not continue until setup succeeds.
pause
exit /b 1
