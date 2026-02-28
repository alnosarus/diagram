#!/bin/bash

# Start both server and client dev servers
# Usage: ./dev.sh

trap 'kill 0; exit' SIGINT SIGTERM

echo "Starting server on :3002..."
cd "$(dirname "$0")/server" && npx tsx index.ts &

echo "Starting client on :5173..."
cd "$(dirname "$0")/client" && npx vite --host &

wait
