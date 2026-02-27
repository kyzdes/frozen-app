#!/bin/sh
set -e

echo "Running database migrations..."
node migrations/run.js

echo "Starting server..."
exec node dist/index.js
