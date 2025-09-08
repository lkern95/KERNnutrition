#!/bin/bash

# Quick deployment script for KERNbalance PWA
echo "🚀 Deploying KERNbalance PWA..."

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ dist folder not found. Building first..."
    npm run build
fi

echo "✅ Ready for deployment!"
echo ""
echo "🌐 Deployment Options:"
echo "1. Netlify Drop: Go to https://netlify.com/drop and drag the 'dist' folder"
echo "2. Vercel: Run 'npx vercel dist --prod'"
echo "3. GitHub Pages: Push dist folder to gh-pages branch"
echo "4. Firebase: Run 'firebase deploy' (after firebase init)"
echo ""
echo "📁 Files ready in 'dist' folder:"
ls -la dist/
echo ""
echo "🎯 After deployment, test PWA features:"
echo "  - Open on mobile device"
echo "  - Add to Home Screen"
echo "  - Test offline functionality"
echo "  - Verify app icon on home screen"
