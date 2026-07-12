#!/bin/sh

echo "Waiting for PostgreSQL database to start..."
npx prisma migrate dev --name init --skip-generate
npx prisma db seed
node dist/server.js
