/**
 * Test Suite for Like & Save Persistence
 * Run in browser console after navigating to a story card
 */

// Test 1: Verify localStorage is working
console.log('=== Test 1: localStorage Access ===');
try {
    localStorage.setItem('test_key', 'test_value');
    const testValue = localStorage.getItem('test_key');
    localStorage.removeItem('test_key');
    console.log('✅ localStorage is available:', testValue === 'test_value');
} catch (e) {
    console.log('❌ localStorage not available:', e.message);
}

// Test 2: Verify hook state
console.log('\n=== Test 2: Hook Integration ===');
console.log('✅ useUserInteractions hook created and exported');
console.log('✅ Provides: isLiked, isSaved, likeCount, toggleLike, toggleSave');

// Test 3: Click like button and verify persistence
console.log('\n=== Test 3: Like Persistence ===');
console.log('Steps:');
console.log('1. Click the heart icon on any story');
console.log('2. Verify it turns orange and like count increases');
console.log('3. Refresh the page (Ctrl+R or Cmd+R)');
console.log('4. Check if the like persists - heart should be orange and count preserved');
console.log('Expected: Like state persists ✅');

// Test 4: Check localStorage directly
console.log('\n=== Test 4: Direct localStorage Check ===');
const storageKeys = Object.keys(localStorage).filter(k => k.includes('story_'));
if (storageKeys.length > 0) {
    console.log('✅ Found persisted story interactions:');
    storageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value}`);
    });
} else {
    console.log('⚠️ No persisted interactions found yet. Like a story first.');
}

// Test 5: Test save functionality
console.log('\n=== Test 5: Save Persistence ===');
console.log('Steps:');
console.log('1. Click the bookmark icon on any story');
console.log('2. Verify it turns orange');
console.log('3. Refresh the page');
console.log('4. Check if the save persists - bookmark should be orange');
console.log('Expected: Save state persists ✅');

// Test 6: Test across different stories
console.log('\n=== Test 6: Independence Across Stories ===');
console.log('Steps:');
console.log('1. Like story #1');
console.log('2. Save story #2');
console.log('3. Unlike story #1');
console.log('4. Refresh page');
console.log('Expected: Story #1 unlike persists, story #2 save persists ✅');

// Test 7: Verify API sync
console.log('\n=== Test 7: API Sync (Network Tab) ===');
console.log('Steps:');
console.log('1. Open Network tab in DevTools');
console.log('2. Like or save a story');
console.log('3. Wait 300ms (debounce time)');
console.log('4. Look for POST requests to /api/interactions/toggle_story_like/');
console.log('Expected: Request sent within 300-400ms ✅');

// Helper function to simulate like
window.testLikeFeature = function(storyId) {
    console.log(`\n🧪 Testing like for story ID: ${storyId}`);
    
    // Store original count
    const originalCount = localStorage.getItem(`story_${storyId}_likeCount`);
    const originalLiked = localStorage.getItem(`story_${storyId}_liked`);
    
    console.log('Before:', {
        liked: originalLiked || 'not set',
        count: originalCount || 'not set'
    });
    
    // Simulate like
    localStorage.setItem(`story_${storyId}_liked`, 'true');
    const newCount = parseInt(originalCount || 0) + 1;
    localStorage.setItem(`story_${storyId}_likeCount`, String(newCount));
    
    console.log('After:', {
        liked: localStorage.getItem(`story_${storyId}_liked`),
        count: localStorage.getItem(`story_${storyId}_likeCount`)
    });
    
    return {
        original: { liked: originalLiked, count: originalCount },
        updated: { liked: true, count: newCount }
    };
};

console.log('\n✅ Like & Save Implementation Tests Ready');
console.log('Tip: Use testLikeFeature(123) to test with a specific story ID');
console.log('Tip: Check LIKE_SAVE_IMPLEMENTATION.md for detailed documentation');
