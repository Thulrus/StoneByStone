#!/usr/bin/env bash
# Setup script for StoneByStone project
# Run this after cloning the repository

set -e

echo "🪨 StoneByStone Setup Script"
echo "============================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎣 Setting up git hooks..."
npm run prepare

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  - Run 'npm run dev' to start the development server"
echo "  - Run 'npm test' to run tests"
echo "  - Run 'npm run build' to build for production"
echo ""
echo "Pre-commit hooks are now active and will:"
echo "  - Run ESLint and Prettier on staged files"
echo "  - Run type checking"
echo "  - Run tests"
