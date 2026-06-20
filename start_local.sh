#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")"

echo "============================================="
echo "   Starting ZeroTesting macOS Local Stack     "
echo "============================================="

# 1. Start Postgres and Redis in Docker
echo "1. Starting PostgreSQL and Redis in Docker..."
docker compose up -d postgres redis

# 2. Stop any Docker-based backend/worker/frontend containers
echo "2. Ensuring Docker-based frontend/backend/worker are stopped..."
docker compose stop backend worker frontend 2>/dev/null || true

# 3. Wait for Postgres to be ready
echo "3. Waiting for Postgres to become healthy..."
until docker compose exec postgres pg_isready -U postgres >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo ""
echo "PostgreSQL is healthy and accepting connections!"

# 4. Choose how to run the macOS native services
echo "---------------------------------------------"
echo "Choose how you want to run the local servers:"
echo "1) Combined: Run all in a single terminal tab (using concurrently)"
echo "2) Separated: Open 3 separate native macOS Terminal tabs"
echo "---------------------------------------------"
read -p "Select option (1 or 2): " choice

if [ "$choice" = "2" ]; then
  echo "Opening native macOS Terminal tabs..."
  osascript -e 'tell application "Terminal"
      activate
      -- Open Backend Server in new window
      do script "cd \"'$PWD'/backend\" && source venv/bin/activate && python manage.py runserver"
      
      -- Open Celery Worker in a new tab
      tell application "System Events" to keystroke "t" using command down
      delay 0.5
      do script "cd \"'$PWD'/backend\" && source venv/bin/activate && celery -A config.celery worker --loglevel=info --concurrency=2" in front window
      
      -- Open Vite Frontend in a new tab
      tell application "System Events" to keystroke "t" using command down
      delay 0.5
      do script "cd \"'$PWD'/frontend\" && npm run dev" in front window
  end tell'
  echo "Tabs opened successfully! Check your Terminal app."
else
  echo "Running combined servers in this terminal..."
  npx concurrently --kill-others \
    -n "backend,worker,frontend" \
    -c "green,yellow,cyan" \
    "cd backend && source venv/bin/activate && python manage.py runserver" \
    "cd backend && source venv/bin/activate && celery -A config.celery worker --loglevel=info --concurrency=2" \
    "cd frontend && npm run dev"
fi
