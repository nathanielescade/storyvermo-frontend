# Guest Notification System - Verification Script (PowerShell)
# Run this to verify all files are in place and working correctly
# Usage: .\verify-guest-notifications.ps1

Write-Host "`n🔍 Guest Notification System - Verification Script" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Initialize counters
$passed = 0
$failed = 0
$warning = 0

# Function to check file exists
function Test-FileExists {
    param(
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        Write-Host "✓ File exists: $FilePath" -ForegroundColor Green
        $passed++
        return $true
    } else {
        Write-Host "✗ File missing: $FilePath" -ForegroundColor Red
        $failed++
        return $false
    }
}

# Function to check if file contains text
function Test-FileContains {
    param(
        [string]$FilePath,
        [string]$SearchString
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -match [regex]::Escape($SearchString)) {
            Write-Host "✓ Found in $FilePath : $SearchString" -ForegroundColor Green
            $passed++
            return $true
        } else {
            Write-Host "✗ Not found in $FilePath : $SearchString" -ForegroundColor Red
            $failed++
            return $false
        }
    } else {
        Write-Host "✗ File not found: $FilePath" -ForegroundColor Red
        $failed++
        return $false
    }
}

# Function to check directory exists
function Test-DirectoryExists {
    param(
        [string]$DirPath
    )
    
    if (Test-Path $DirPath -PathType Container) {
        Write-Host "✓ Directory exists: $DirPath" -ForegroundColor Green
        $passed++
        return $true
    } else {
        Write-Host "! Directory missing: $DirPath" -ForegroundColor Yellow
        $warning++
        return $false
    }
}

Write-Host "Step 1: Checking file existence" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Test-FileExists "hooks/useGuestNotifications.js"
Test-FileExists "lib/guestNotificationUtils.js"
Test-FileExists "src/app/components/GuestNotificationBanner.js"
Test-FileExists "src/app/components/GuestNotificationModal.js"
Test-FileExists "src/app/components/GuestNotificationContainer.js"
Write-Host ""

Write-Host "Step 2: Checking documentation" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Test-FileExists "GUEST_NOTIFICATIONS_SUMMARY.md"
Test-FileExists "GUEST_NOTIFICATIONS_QUICK_REFERENCE.md"
Test-FileExists "GUEST_NOTIFICATIONS_IMPLEMENTATION.md"
Test-FileExists "GUEST_NOTIFICATIONS_DEPLOYMENT.md"
Test-FileExists "GUEST_NOTIFICATIONS_DIAGRAMS.md"
Test-FileExists "GUEST_NOTIFICATIONS_INDEX.md"
Write-Host ""

Write-Host "Step 3: Checking test files" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Test-FileExists "__tests__/guestNotifications.test.js"
Write-Host ""

Write-Host "Step 4: Checking layout.js integration" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Test-FileContains "src/app/layout.js" "GuestNotificationContainer"
Test-FileContains "src/app/layout.js" "import GuestNotificationContainer"
Write-Host ""

Write-Host "Step 5: Checking hook exports" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Test-FileContains "hooks/useGuestNotifications.js" "export function useGuestNotifications"
Test-FileContains "hooks/useGuestNotifications.js" "export default useGuestNotifications"
Write-Host ""

Write-Host "Step 6: Checking component implementations" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Test-FileContains "src/app/components/GuestNotificationBanner.js" "export default function GuestNotificationBanner"
Test-FileContains "src/app/components/GuestNotificationModal.js" "export default function GuestNotificationModal"
Test-FileContains "src/app/components/GuestNotificationContainer.js" "export default function GuestNotificationContainer"
Write-Host ""

Write-Host "Step 7: Checking utility functions" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Test-FileContains "lib/guestNotificationUtils.js" "export const getDismissedNotifications"
Test-FileContains "lib/guestNotificationUtils.js" "export const formatNotification"
Test-FileContains "lib/guestNotificationUtils.js" "export const trackGuestAnalytic"
Write-Host ""

Write-Host "Step 8: Checking directories" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Test-DirectoryExists "hooks"
Test-DirectoryExists "lib"
Test-DirectoryExists "src/app/components"
Test-DirectoryExists "__tests__"
Write-Host ""

# Summary
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$total = $passed + $failed + $warning

Write-Host "✓ Passed: $passed" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "✗ Failed: $failed" -ForegroundColor Red
}
if ($warning -gt 0) {
    Write-Host "! Warnings: $warning" -ForegroundColor Yellow
}
Write-Host "─────────────────────"
Write-Host "Total checks: $total"
Write-Host ""

# Overall status
if ($failed -eq 0) {
    Write-Host "✅ All checks passed! System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm run build"
    Write-Host "2. Run: npm run dev"
    Write-Host "3. Open: http://localhost:3000 (in incognito mode)"
    Write-Host "4. Read: GUEST_NOTIFICATIONS_INDEX.md"
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ Some checks failed. Please review above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed items:" -ForegroundColor Yellow
    Write-Host "- Check file paths are correct"
    Write-Host "- Verify all files were created"
    Write-Host "- Check for any uncommitted changes"
    Write-Host ""
    exit 1
}
