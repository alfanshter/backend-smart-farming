#!/bin/bash

# AUTO DRIP TEST SCRIPT
# Quick test untuk Auto Drip Irrigation System

BASE_URL="http://localhost:3001"
TOKEN=""

echo "🧪 AUTO DRIP IRRIGATION - TEST SCRIPT"
echo "======================================"
echo ""

# 1. Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartfarming.com",
    "password": "Admin123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Get All Active Schedules
echo "2️⃣  Getting all active schedules..."
curl -s -X GET $BASE_URL/auto-drip/active \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 3. Create New Schedule
echo "3️⃣  Creating new auto drip schedule..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/auto-drip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "a0000000-0000-0000-0000-000000000003",
    "isActive": true,
    "timeSlots": [
      {
        "startTime": "08:00",
        "durationMinutes": 5,
        "durationSeconds": 30
      },
      {
        "startTime": "16:00",
        "durationMinutes": 4,
        "durationSeconds": 0
      }
    ],
    "activeDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }')

echo $CREATE_RESPONSE | jq '.'

SCHEDULE_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
echo ""
echo "Schedule ID: $SCHEDULE_ID"
echo ""

# 4. Get Schedule by ID
if [ -n "$SCHEDULE_ID" ]; then
  echo "4️⃣  Getting schedule by ID..."
  curl -s -X GET $BASE_URL/auto-drip/$SCHEDULE_ID \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
fi

# 5. Get All Schedules
echo "5️⃣  Getting all schedules..."
curl -s -X GET $BASE_URL/auto-drip \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
echo " total schedules"
echo ""

# 6. Update Schedule
if [ -n "$SCHEDULE_ID" ]; then
  echo "6️⃣  Updating schedule..."
  curl -s -X PUT $BASE_URL/auto-drip/$SCHEDULE_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "isActive": false,
      "timeSlots": [
        {
          "startTime": "09:00",
          "durationMinutes": 6,
          "durationSeconds": 0
        }
      ],
      "activeDays": ["monday", "wednesday", "friday"]
    }' | jq '.message'
  echo ""
fi

# 7. Toggle Active
if [ -n "$SCHEDULE_ID" ]; then
  echo "7️⃣  Toggling active status..."
  curl -s -X PATCH $BASE_URL/auto-drip/$SCHEDULE_ID/toggle \
    -H "Authorization: Bearer $TOKEN" | jq '.message'
  echo ""
fi

# 8. Get Schedule by Zone
echo "8️⃣  Getting schedule by zone..."
curl -s -X GET $BASE_URL/auto-drip/zone/a0000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
echo ""

# 9. Delete Schedule (optional - uncomment to test)
# if [ -n "$SCHEDULE_ID" ]; then
#   echo "9️⃣  Deleting schedule..."
#   curl -s -X DELETE $BASE_URL/auto-drip/$SCHEDULE_ID \
#     -H "Authorization: Bearer $TOKEN" | jq '.message'
#   echo ""
# fi

echo "✅ All tests completed!"
echo ""
echo "📝 Check backend logs for scheduler activity"
echo "🤖 Scheduler checks schedules every minute"
echo ""
