@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar-TheMask.ps1" -Keyboard
if errorlevel 1 pause
