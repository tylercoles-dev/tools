#!/bin/bash
# Cleanup script to remove SQLite and MySQL dependencies and rebuild with PostgreSQL only

echo "🧹 Cleaning up SQLite and MySQL dependencies..."

# Remove all node_modules to ensure clean install
echo "Removing all node_modules directories..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove package-lock.json files to ensure clean dependency resolution
echo "Removing package-lock.json files..."
find . -name "package-lock.json" -exec rm -f {} + 2>/dev/null || true

echo "✅ Cleanup complete! Run 'npm install' in each service directory to reinstall dependencies."
echo ""
echo "Build order:"
echo "1. cd core && npm install && npm run build"
echo "2. cd migrations && npm install && npm run build"
echo "3. Install and build other services (gateway, servers, workers, web)"