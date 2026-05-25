@echo off
setlocal
echo Setting up CenterCRM database...

set PGPATH=
for %%V in (16 15 14) do (
  if exist "C:\Program Files\PostgreSQL\%%V\bin\psql.exe" set PGPATH=C:\Program Files\PostgreSQL\%%V\bin
)

if "%PGPATH%"=="" (
  echo PostgreSQL not found. Install PostgreSQL 16 or start Docker postgres.
  exit /b 1
)

set PGPASSWORD=postgres
"%PGPATH%\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE USER centercrm WITH PASSWORD 'centercrm';" 2>nul
"%PGPATH%\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE centercrm OWNER centercrm;" 2>nul
"%PGPATH%\psql.exe" -U postgres -h 127.0.0.1 -c "GRANT ALL PRIVILEGES ON DATABASE centercrm TO centercrm;" 2>nul

cd /d "%~dp0..\packages\database"
set DATABASE_URL=postgresql://centercrm:centercrm@127.0.0.1:5432/centercrm
call npx prisma migrate deploy
call npm run seed

echo.
echo Database ready. Login: master@centercrm.com / Admin@123
endlocal
