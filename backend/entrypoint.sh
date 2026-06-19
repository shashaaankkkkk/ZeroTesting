#!/bin/bash
set -e

# Ensure logs directory exists
mkdir -p /app/logs

echo "Waiting for PostgreSQL..."
while ! python -c "import psycopg2; psycopg2.connect(host='$DB_HOST', port='$DB_PORT', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')" 2>/dev/null; do
    sleep 1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating superuser if not exists..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('SUPERUSER_EMAIL')
username = os.environ.get('SUPERUSER_USERNAME')
password = os.environ.get('SUPERUSER_PASSWORD')
if email and username and password:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            first_name='Admin',
            last_name='User',
        )
        print(f'Superuser created: {email}')
    else:
        print('Superuser already exists')
else:
    print('Superuser environment variables (SUPERUSER_EMAIL, SUPERUSER_USERNAME, SUPERUSER_PASSWORD) not fully set. Skipping superuser creation.')
"

echo "Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Starting server..."
exec "$@"
