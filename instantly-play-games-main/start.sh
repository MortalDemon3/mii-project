#!/bin/sh
# Start the Express auth server in background
cd /app/server && node server.js &
# Start Nginx in foreground
nginx -g 'daemon off;'
