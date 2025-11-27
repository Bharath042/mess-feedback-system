#!/bin/bash

# Local testing script - run this before deploying
# This tests all endpoints locally without Docker

echo "🧪 Starting Local Tests..."
echo ""

# Start the server in background
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "✅ Server started (PID: $SERVER_PID)"
echo ""

# Test endpoints
echo "🔍 Testing Endpoints..."
echo ""

# Test 1: User Profile
echo "1️⃣  Testing GET /api/user/profile"
curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/user/profile | jq . || echo "❌ Failed"
echo ""

# Test 2: Menu Today
echo "2️⃣  Testing GET /api/menu/today"
curl -s http://localhost:3000/api/menu/today | jq . || echo "❌ Failed"
echo ""

# Test 3: Mess Halls
echo "3️⃣  Testing GET /api/mess-halls"
curl -s http://localhost:3000/api/mess-halls | jq . || echo "❌ Failed"
echo ""

# Test 4: Current Meal Time
echo "4️⃣  Testing GET /api/current-meal-time"
curl -s http://localhost:3000/api/current-meal-time | jq . || echo "❌ Failed"
echo ""

# Test 5: Meal Types
echo "5️⃣  Testing GET /api/meal-types"
curl -s http://localhost:3000/api/meal-types | jq . || echo "❌ Failed"
echo ""

# Test 6: Notifications
echo "6️⃣  Testing GET /api/notifications/student001"
curl -s http://localhost:3000/api/notifications/student001 | jq . || echo "❌ Failed"
echo ""

# Test 7: Dashboard Stats
echo "7️⃣  Testing GET /api/dashboard/stats"
curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/dashboard/stats | jq . || echo "❌ Failed"
echo ""

# Kill the server
kill $SERVER_PID

echo ""
echo "✅ Local tests completed!"
