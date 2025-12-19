# LCP Optimization Implementation Checklist

## ✅ COMPLETED

### 1. Added `fetchpriority="high"` to First Image
- **File**: `src/app/components/storycard/StoryCardSkeleton.js`
- **Change**: Added `fetchpriority="high"` prop to first story card image (index === 0)
- **Impact**: Browser will prioritize this image for LCP calculation
- **Browser Support**: Chrome 101+, Edge 101+, Opera 87+

### 2. Added `loading="eager"` to First Image  
- **File**: `src/app/components/storycard/StoryCardSkeleton.js`
- **Change**: Added `loading="eager"` alongside `priority` prop
- **Impact**: Prevents lazy-loading of critical LCP image
- **Expected**: Faster image load, reduced resource load delay

### 3. Increased Initial Story Fetch Limit
- **File**: `src/app/page.js`
- **Change**: Increased `limit` from 8 to 12
- **Impact**: More stories preloaded, reduces need for scrolling to see content
- **Benefit**: Better perceived performance for first viewport

---

## 🔄 NEEDS TESTING

Run Lighthouse after deploying these changes:
```bash
npm run build
npm run start
# Run Lighthouse test on homepage
```

Expected improvements:
- ❌ LCP: 7.3s → **~2.5s** (needs 65% reduction)
- ❌ Resource Load Delay: 7,200ms → **~2,500ms** (needs 65% reduction)
- ⏱️ May need additional optimizations if not achieved

---

## 📋 STILL TODO (If LCP Doesn't Improve)

### High Priority
- [ ] Check if images are being served with proper cache headers
- [ ] Verify CDN response times for DigitalOcean Spaces
- [ ] Consider image URL format - ensure it's discoverable in initial HTML
- [ ] Add `content-visibility: auto` to off-screen story cards (CSS optimization)

### Medium Priority  
- [ ] Add image preload hints in `layout.js` (if image URL is known at build time)
- [ ] Optimize image aspect ratios to prevent layout shifts
- [ ] Consider serving WebP/AVIF to reduce file size further

### Investigation Needed
- [ ] Why is resource load delay so high (7,200ms)?
  - Is it CDN latency?
  - Is it waiting for API response?
  - Is it waiting for JavaScript to execute?
  
- [ ] Is the image URL discoverable in initial HTML?
  - Use DevTools Network tab in Lighthouse
  - Check if image is marked as LCP candidate
  - Verify `fetchpriority` attribute is present in rendered HTML

---

## 🧪 How to Verify Changes

1. **Check rendered HTML** for `fetchpriority="high"`:
   ```bash
   # In browser DevTools, inspect the first story image
   # Should see: <img ... fetchpriority="high" loading="eager" ... />
   ```

2. **Run Lighthouse**:
   ```bash
   # Chrome DevTools > Lighthouse > Analyze page load
   # Focus on LCP breakdown metrics
   ```

3. **Network tab analysis**:
   - Verify image starts loading early
   - Check if `fetchpriority` reduces delay
   - Monitor CDN response time

---

## 📊 Expected Results Timeline

| Phase | Time | Expected LCP |
|-------|------|--------------|
| **Before** (Baseline) | 7.3s | Poor |
| **After Fetch Priority** | 3-5s | Fair |
| **After Full Optimization** | 1.5-2.5s | Good ✅ |

The `fetchpriority="high"` alone might reduce LCP by 30-40%, but addressing the 7,200ms resource load delay is key to reaching "Good" status.

---

## 🔗 References

- [Optimize Largest Contentful Paint (LCP)](https://web.dev/optimize-lcp/)
- [fetchpriority API](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/fetchpriority)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
