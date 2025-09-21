@echo off
echo 🏈 Setting up 10-Person Test League
echo ====================================

rem Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

rem Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js first.
    exit /b 1
)

rem Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed. Please install npm first.
    exit /b 1
)

echo 🔧 Installing dependencies...
npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    exit /b 1
)

echo 🗄️ Setting up database...
npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo Error: Failed to setup database.
    exit /b 1
)

echo 👥 Creating test league with 10 users...
npx tsx scripts/seed-test-league.ts
if errorlevel 1 (
    echo Error: Failed to create test league.
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 League Details:
echo - League: Test League 2025
echo - Commissioner: Nicholas D'Amato
echo - Current Week: 3
echo - Teams: 10
echo.
echo 🔐 Login Info:
echo All users can login with password: fantasy2025
echo.
echo 👑 Test Users:
echo 1. Nicholas D'Amato (Commissioner) - D'Amato Dynasty
echo 2. Nick Hartley - Hartley's Heroes
echo 3. Jack McCaigue - Jack Attack
echo 4. Larry McCaigue - Larry's Legends
echo 5. Renee McCaigue - Renee's Reign
echo 6. Jon Kornbeck - Kornbeck Crushers
echo 7. David Jarvey - Jarvey's Juggernauts
echo 8. Kaity Lorbecki - Kaity's Knights
echo 9. Cason Minor - Minor Threat
echo 10. Brittany Bergum - Bergum's Best
echo.
echo 🚀 Ready to start!
echo Run: npm run dev
echo Then go to: http://localhost:3007/login

pause