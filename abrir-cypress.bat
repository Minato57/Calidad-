@echo off
title Lanzador de Cypress - Centro de Salud San Genaro
echo ===================================================
echo   Iniciando Cypress UI para pruebas E2E / Componentes
echo ===================================================
cd /d "%~dp0Frontend"
call npx cypress open
pause

