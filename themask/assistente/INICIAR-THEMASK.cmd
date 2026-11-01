@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar-TheMask.ps1"
if errorlevel 1 pause
