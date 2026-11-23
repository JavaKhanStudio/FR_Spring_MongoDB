@echo off
rem Ecrit par Ficelle (activite/gen.py) : lance verifier.ps1 sans que la politique
rem d execution de PowerShell le refuse.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verifier.ps1" %*
exit /b %errorlevel%
