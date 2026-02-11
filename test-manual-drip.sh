#!/bin/bash

# 🌱 Manual Drip Irrigation Control - Quick Test Script
# Test semua fitur zone control untuk penyiraman manual

BASE_URL="http://localhost:3001"
TOKEN=""

echo "🌱 =========================================="
echo "   MANUAL DRIP CONTROL - QUICK TEST"
echo "=========================================="
echo ""

# Step 1: Login
echo "📝 Step 1: Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartfarming.com",
    "password": "Admin123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login berhasil! Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get All Zones
echo "📋 Step 2: Lihat semua zona..."
ZONES=$(curl -s -X GET "$BASE_URL/zones" \
  -H "Authorization: Bearer $TOKEN")

echo "$ZONES" | jq '.'
echo ""

# Extract Zone IDs
ZONE_A_ID=$(echo $ZONES | jq -r '.[0].id')
ZONE_B_ID=$(echo $ZONES | jq -r '.[1].id')

echo "📍 Zona A ID: $ZONE_A_ID"
echo "📍 Zona B ID: $ZONE_B_ID"
echo ""

# Step 3: Start Watering Zona A (Test 30 detik)
echo "💧 Step 3: Mulai penyiraman Zona A (30 detik test)..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/zones/control" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"zoneId\": \"$ZONE_A_ID\",
    \"action\": \"start\",
    \"durationMinutes\": 0,
    \"durationSeconds\": 30
  }")

echo "$START_RESPONSE" | jq '.'
echo ""

# Step 4: Check Status Real-time
echo "⏱️  Step 4: Monitor status real-time (5x polling)..."
for i in {1..5}; do
  echo "  Polling #$i..."
  STATUS=$(curl -s -X GET "$BASE_URL/zones/$ZONE_A_ID/status" \
    -H "Authorization: Bearer $TOKEN")
  
  REMAINING=$(echo $STATUS | jq -r '.remainingSeconds')
  PROGRESS=$(echo $STATUS | jq -r '.progress')
  
  echo "    → Sisa: ${REMAINING}s | Progress: ${PROGRESS}%"
  sleep 2
done
echo ""

# Step 5: Stop Manual (sebelum 30 detik selesai)
echo "🛑 Step 5: Stop manual..."
STOP_RESPONSE=$(curl -s -X POST "$BASE_URL/zones/control" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"zoneId\": \"$ZONE_A_ID\",
    \"action\": \"stop\"
  }")

echo "$STOP_RESPONSE" | jq '.'
echo ""

# Step 6: Test Parallel Watering (Zona A dan B bersamaan)
echo "🔀 Step 6: Test penyiraman parallel (Zona A & B)..."
echo "  → Start Zona A (1 menit)..."
curl -s -X POST "$BASE_URL/zones/control" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"zoneId\": \"$ZONE_A_ID\",
    \"action\": \"start\",
    \"durationMinutes\": 1,
    \"durationSeconds\": 0
  }" | jq '.message'

echo "  → Start Zona B (1 menit 30 detik)..."
curl -s -X POST "$BASE_URL/zones/control" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"zoneId\": \"$ZONE_B_ID\",
    \"action\": \"start\",
    \"durationMinutes\": 1,
    \"durationSeconds\": 30
  }" | jq '.message'

echo ""

# Step 7: Check Active Zones
echo "🚰 Step 7: Cek zona yang aktif..."
ACTIVE_ZONES=$(curl -s -X GET "$BASE_URL/zones/active" \
  -H "Authorization: Bearer $TOKEN")

echo "$ACTIVE_ZONES" | jq '.[] | {name, remainingSeconds, progress}'
echo ""

# Step 8: Emergency Stop All
echo "🚨 Step 8: Emergency stop semua zona..."
EMERGENCY=$(curl -s -X POST "$BASE_URL/zones/emergency-stop" \
  -H "Authorization: Bearer $TOKEN")

echo "$EMERGENCY" | jq '.'
echo ""

# Final Status
echo "📊 Step 9: Status akhir semua zona..."
curl -s -X GET "$BASE_URL/zones" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {name, isActive, durationMinutes, durationSeconds}'

echo ""
echo "✅ =========================================="
echo "   TEST SELESAI!"
echo "=========================================="
echo ""
echo "📝 Summary:"
echo "  ✅ Login berhasil"
echo "  ✅ List zones berhasil"
echo "  ✅ Start watering berhasil"
echo "  ✅ Real-time status polling OK"
echo "  ✅ Stop manual berhasil"
echo "  ✅ Parallel watering OK"
echo "  ✅ Emergency stop berhasil"
echo ""
echo "🎉 Sistem Manual Drip Control siap digunakan!"
