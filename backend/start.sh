#!/bin/sh

echo "Waiting for PostgreSQL database to start..."
npx prisma migrate deploy
npx prisma db seed
node dist/server.js
