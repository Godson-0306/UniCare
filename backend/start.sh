#!/usr/bin/env bash
set -o errexit

python manage.py migrate --noinput
if [ "${SEED_DEMO_ON_BOOT:-}" = "true" ]; then
  python manage.py seed_demo_data
fi
exec daphne -b 0.0.0.0 -p "$PORT" config.asgi:application
