#!/bin/bash

# ================================================================
# 🧪 CORS & API Connection Test Script
# ================================================================
# This script tests CORS configuration and API connectivity
# Usage: ./test-cors-api.sh [domain]
# ================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default domain
DOMAIN=${1:-"agrogonta.ptpws.id"}
API_URL="http://${DOMAIN}:3001"

echo "=================================================="
echo "🧪 CORS & API Connection Test"
echo "=================================================="
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}API URL: ${API_URL}${NC}"
echo ""

# ================================================================
# Test 1: Basic Connectivity
# ================================================================
echo -e "${YELLOW}Test 1: Basic Connectivity${NC}"
echo "-----------------------------------"
if curl -s --max-time 5 "${API_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is reachable${NC}"
else
    echo -e "${RED}❌ Server is NOT reachable${NC}"
    echo "Possible issues:"
    echo "  - Firewall blocking port 3001"
    echo "  - Backend not running"
    echo "  - Wrong domain/IP"
    exit 1
fi
echo ""

# ================================================================
# Test 2: CORS Preflight (OPTIONS)
# ================================================================
echo -e "${YELLOW}Test 2: CORS Preflight Request${NC}"
echo "-----------------------------------"
PREFLIGHT=$(curl -s -I -X OPTIONS "${API_URL}/auth/login" \
    -H "Origin: http://${DOMAIN}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    2>&1)

echo "$PREFLIGHT" | grep -i "HTTP\|Access-Control"

if echo "$PREFLIGHT" | grep -qi "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS preflight passed${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers not in preflight (might be OK)${NC}"
fi
echo ""

# ================================================================
# Test 3: Actual Login Request
# ================================================================
echo -e "${YELLOW}Test 3: Login API Request${NC}"
echo "-----------------------------------"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/auth/login" \
    -H "Origin: http://${DOMAIN}" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@smartfarming.com",
        "password": "Admin123!"
    }' 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}⚠️  Authentication failed (credentials might be wrong)${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY"
else
    echo -e "${RED}❌ Request failed with status $HTTP_CODE${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY"
fi
echo ""

# ================================================================
# Test 4: CORS Headers in Response
# ================================================================
echo -e "${YELLOW}Test 4: CORS Headers in Response${NC}"
echo "-----------------------------------"

RESPONSE_HEADERS=$(curl -s -I -X POST "${API_URL}/auth/login" \
    -H "Origin: http://${DOMAIN}" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@smartfarming.com",
        "password": "Admin123!"
    }' 2>&1)

echo "$RESPONSE_HEADERS" | grep -i "Access-Control" || echo -e "${YELLOW}No Access-Control headers found${NC}"

if echo "$RESPONSE_HEADERS" | grep -qi "Access-Control-Allow-Origin.*${DOMAIN}"; then
    echo -e "${GREEN}✅ CORS origin matches: ${DOMAIN}${NC}"
elif echo "$RESPONSE_HEADERS" | grep -qi "Access-Control-Allow-Origin"; then
    ORIGIN=$(echo "$RESPONSE_HEADERS" | grep -i "Access-Control-Allow-Origin" | cut -d' ' -f2)
    echo -e "${YELLOW}⚠️  CORS origin: ${ORIGIN}${NC}"
    echo -e "${YELLOW}   Expected: http://${DOMAIN}${NC}"
else
    echo -e "${RED}❌ No CORS headers in response${NC}"
fi
echo ""

# ================================================================
# Test 5: Port Accessibility
# ================================================================
echo -e "${YELLOW}Test 5: Port 3001 Accessibility${NC}"
echo "-----------------------------------"

if command -v nc &> /dev/null; then
    if nc -zv ${DOMAIN} 3001 2>&1 | grep -q "succeeded\|open"; then
        echo -e "${GREEN}✅ Port 3001 is open${NC}"
    else
        echo -e "${RED}❌ Port 3001 is NOT accessible${NC}"
        echo "Fix: sudo ufw allow 3001/tcp"
    fi
else
    echo -e "${YELLOW}⚠️  'nc' command not found, skipping port check${NC}"
fi
echo ""

# ================================================================
# Test 6: DNS Resolution
# ================================================================
echo -e "${YELLOW}Test 6: DNS Resolution${NC}"
echo "-----------------------------------"
IP=$(dig +short ${DOMAIN} | tail -n1)
if [ -z "$IP" ]; then
    IP=$(host ${DOMAIN} | grep "has address" | awk '{print $4}')
fi

if [ -n "$IP" ]; then
    echo -e "${GREEN}✅ ${DOMAIN} resolves to: ${IP}${NC}"
else
    echo -e "${RED}❌ Cannot resolve ${DOMAIN}${NC}"
fi
echo ""

# ================================================================
# Summary
# ================================================================
echo "=================================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================================================="
echo ""

# Count tests
TOTAL_TESTS=6
PASSED=0

# Reachability
if curl -s --max-time 5 "${API_URL}" > /dev/null 2>&1; then
    ((PASSED++))
    echo -e "✅ Server reachability"
else
    echo -e "❌ Server reachability"
fi

# DNS
if [ -n "$IP" ]; then
    ((PASSED++))
    echo -e "✅ DNS resolution"
else
    echo -e "❌ DNS resolution"
fi

# Port
if command -v nc &> /dev/null; then
    if nc -zv ${DOMAIN} 3001 2>&1 | grep -q "succeeded\|open"; then
        ((PASSED++))
        echo -e "✅ Port 3001 open"
    else
        echo -e "❌ Port 3001 open"
    fi
fi

# API response
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    ((PASSED++))
    echo -e "✅ API responding"
else
    echo -e "❌ API responding"
fi

# CORS
if echo "$RESPONSE_HEADERS" | grep -qi "Access-Control-Allow-Origin"; then
    ((PASSED++))
    echo -e "✅ CORS headers present"
else
    echo -e "❌ CORS headers present"
fi

echo ""
echo -e "${BLUE}Score: ${PASSED}/${TOTAL_TESTS} tests passed${NC}"
echo ""

if [ $PASSED -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! Your API is ready!${NC}"
    echo ""
    echo "✅ You can now use this API from your frontend:"
    echo "   API URL: ${API_URL}"
    echo "   Login: POST ${API_URL}/auth/login"
    echo ""
elif [ $PASSED -ge 3 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed, but some issues found.${NC}"
    echo ""
    echo "📝 Recommendations:"
    echo "  1. Check firewall: sudo ufw status"
    echo "  2. Open port: sudo ufw allow 3001/tcp"
    echo "  3. Check backend logs: docker-compose logs backend"
    echo "  4. Review CORS settings in src/main.ts"
    echo ""
else
    echo -e "${RED}❌ Multiple tests failed. Check configuration.${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Is backend running? docker ps | grep backend"
    echo "  2. Check logs: docker-compose logs backend"
    echo "  3. Is firewall blocking? sudo ufw status"
    echo "  4. Can you ping server? ping ${DOMAIN}"
    echo ""
    echo "📚 See VPS_CORS_FIX.md for detailed guide"
    echo ""
fi

echo "=================================================="
