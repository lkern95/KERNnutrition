@echo off
echo 🚀 Deploying KERNbalance PWA...

REM Check if dist folder exists
if not exist "dist" (
    echo ❌ dist folder not found. Building first...
    npm run build
)

echo ✅ Ready for deployment!
echo.
echo 🌐 Deployment Options:
echo 1. Netlify Drop: Go to https://netlify.com/drop and drag the 'dist' folder
echo 2. Vercel: Run 'npx vercel dist --prod'
echo 3. GitHub Pages: Push dist folder to gh-pages branch
echo 4. Firebase: Run 'firebase deploy' (after firebase init)
echo.
echo 📁 Files ready in 'dist' folder:
dir dist
echo.
echo 🎯 After deployment, test PWA features:
echo   - Open on mobile device
echo   - Add to Home Screen
echo   - Test offline functionality
echo   - Verify app icon on home screen
echo.
echo 📱 For mobile testing, use your deployed URL
echo 🔗 Local test: http://localhost:3000/pwa-test.html
pause
