#!/bin/bash
# Guest Notification System - Verification Script
# Run this to verify all files are in place and working correctly

echo "🔍 Guest Notification System - Verification Script"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0
WARNING=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
        return 1
    fi
}

# Function to check if file contains text
check_contains() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Found in $1: $2"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} Not found in $1: $2"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}!${NC} Directory missing: $1"
        ((WARNING++))
        return 1
    fi
}

echo -e "${BLUE}Step 1: Checking file existence${NC}"
echo "=================================="
check_file "hooks/useGuestNotifications.js"
check_file "lib/guestNotificationUtils.js"
check_file "src/app/components/GuestNotificationBanner.js"
check_file "src/app/components/GuestNotificationModal.js"
check_file "src/app/components/GuestNotificationContainer.js"
echo ""

echo -e "${BLUE}Step 2: Checking documentation${NC}"
echo "================================"
check_file "GUEST_NOTIFICATIONS_SUMMARY.md"
check_file "GUEST_NOTIFICATIONS_QUICK_REFERENCE.md"
check_file "GUEST_NOTIFICATIONS_IMPLEMENTATION.md"
check_file "GUEST_NOTIFICATIONS_DEPLOYMENT.md"
check_file "GUEST_NOTIFICATIONS_DIAGRAMS.md"
check_file "GUEST_NOTIFICATIONS_INDEX.md"
echo ""

echo -e "${BLUE}Step 3: Checking test files${NC}"
echo "============================"
check_file "__tests__/guestNotifications.test.js"
echo ""

echo -e "${BLUE}Step 4: Checking layout.js integration${NC}"
echo "======================================="
check_contains "src/app/layout.js" "GuestNotificationContainer"
check_contains "src/app/layout.js" "import GuestNotificationContainer"
echo ""

echo -e "${BLUE}Step 5: Checking hook exports${NC}"
echo "=============================="
check_contains "hooks/useGuestNotifications.js" "export function useGuestNotifications"
check_contains "hooks/useGuestNotifications.js" "export default useGuestNotifications"
echo ""

echo -e "${BLUE}Step 6: Checking component implementations${NC}"
echo "=========================================="
check_contains "src/app/components/GuestNotificationBanner.js" "export default function GuestNotificationBanner"
check_contains "src/app/components/GuestNotificationModal.js" "export default function GuestNotificationModal"
check_contains "src/app/components/GuestNotificationContainer.js" "export default function GuestNotificationContainer"
echo ""

echo -e "${BLUE}Step 7: Checking utility functions${NC}"
echo "==================================="
check_contains "lib/guestNotificationUtils.js" "export const getDismissedNotifications"
check_contains "lib/guestNotificationUtils.js" "export const formatNotification"
check_contains "lib/guestNotificationUtils.js" "export const trackGuestAnalytic"
echo ""

echo -e "${BLUE}Step 8: Checking directories${NC}"
echo "============================="
check_dir "hooks"
check_dir "lib"
check_dir "src/app/components"
check_dir "__tests__"
echo ""

# Summary
echo -e "${BLUE}=================================================="
echo "Verification Summary"
echo "==================================================${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNING))

echo -e "${GREEN}✓ Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}✗ Failed: $FAILED${NC}"
fi
if [ $WARNING -gt 0 ]; then
    echo -e "${YELLOW}! Warnings: $WARNING${NC}"
fi
echo "─────────────────────"
echo "Total checks: $TOTAL"
echo ""

# Overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run build"
    echo "2. Run: npm run dev"
    echo "3. Open: http://localhost:3000 (in incognito mode)"
    echo "4. Read: GUEST_NOTIFICATIONS_INDEX.md"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review above.${NC}"
    echo ""
    echo "Failed items:"
    echo "- Check file paths are correct"
    echo "- Verify all files were created"
    echo "- Check GitHub for any uncommitted changes"
    exit 1
fi
