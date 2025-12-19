# LCP (Largest Contentful Paint) Optimization Plan

## Current Issues Identified
- **LCP Time: 7.3s** (Target: < 2.5s)
- **Resource Load Delay: 7,200 ms** (Too high)
- **Missing `fetchpriority="high"`** on LCP image
- **Lazy loading applied** when it shouldn't be

## Changes Made ✅

### 1. **Added `fetchpriority="high"` to First Story Card Image**
   - File: `src/app/components/storycard/StoryCardSkeleton.js`
   - Change: Added `fetchpriority="high"` prop to the first image (index === 0)
   - Effect: Signals to browser to prioritize this image for LCP
   - Impact: Should reduce resource load delay from 7,200ms

### 2. **Added `loading="eager"` to First Image**
   - Ensures image loads immediately without lazy-loading
   - Prevents the browser from deferring this critical resource
   - Works in conjunction with `priority` prop from Next.js

## Additional Optimization Strategies to Implement

### High Priority (Quick Wins)

#### 1. **Increase Initial Story Fetch Limit**
   - Currently: `limit: 8` in `src/app/page.js`
   - Recommended: Increase to `limit: 12-15` for better perceived performance
   - Ensures LCP image loads in first viewport without scrolling

#### 2. **Add Explicit Image Dimensions**
   - Current: Using `fill` prop with dynamic sizing
   - Issue: Causes layout shifts (CLS issues)
   - Solution: Add explicit width/height to prevent CLS
   ```jsx
   <Image
     src={coverImageUrl}
     alt={story.title}
     width={1024}
     height={1024}
     priority={index === 0}
     fetchpriority="high"
     ...
   />
   ```

#### 3. **Optimize Image Quality for Mobile**
   - Currently: `quality={60}` (good)
   - Consider: Different quality for different breakpoints
   - Mobile users benefit from aggressive compression (50-60%)

#### 4. **Add Image Preload in Layout**
   - File: `src/app/layout.js`
   - Add: `<link rel="preload" as="image" href="..." fetchpriority="high" />`
   - Note: Requires knowing image URL in server component (may not be practical)

### Medium Priority (Noticeable Impact)

#### 5. **Optimize Image Formats**
   - Current: `formats: ['image/avif', 'image/webp']` ✅ (Already good)
   - Verify: Browser support for AVIF
   - Consider: SVG placeholders while images load

#### 6. **Reduce Initial HTML Payload**
   - Strip unnecessary data from first story
   - Remove verse data (already done ✅)
   - Consider: Lazy-loading non-critical story metadata

#### 7. **Add Content-Visibility to Off-Screen Cards**
   - Cards below fold shouldn't be rendered
   - CSS: `content-visibility: auto` for `.scene-card-skeleton`
   - Benefit: Faster initial paint, deferred rendering

#### 8. **Monitor CDN Performance**
   - DigitalOcean Spaces is being used ✅
   - Verify: Edge caching headers
   - Check: Image CDN response times (7,200ms delay suggests CDN or API issue)

### Lower Priority (Fine-tuning)

#### 9. **Skeleton Screen Optimization**
   - Current: Shows title + tags immediately ✅
   - Consider: Using a solid color background matching dominant image color
   - Benefit: Better perceived performance

#### 10. **Server-Side Image Optimization**
   - Consider: Resizing images server-side before sending to CDN
   - Benefit: Reduced client-side processing

## Performance Metrics to Track

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| LCP | 7.3s | < 2.5s | Priority 1 |
| Resource Load Delay | 7,200ms | < 2,500ms | Priority 1 |
| Time to First Byte | 0ms | < 600ms | Priority 2 |
| Element Render Delay | 50ms | < 50ms | Priority 3 |

## Root Cause Analysis

The **7,200ms resource load delay** suggests:
1. Images aren't discoverable in HTML early enough
2. CDN might be slow or image URLs are being generated dynamically
3. Missing proper resource hints (preconnect, dns-prefetch)

**Solution**: Ensure images are referenced directly in HTML at server-render time, not discovered via JavaScript.

## Testing Steps

1. Run Lighthouse test after changes
2. Monitor CrUX metrics (if available)
3. Test on mobile devices with 4G throttling
4. Verify images render before user interaction

## Related Files
- `src/app/components/storycard/StoryCardSkeleton.js` - ✅ Updated
- `src/app/page.js` - Consider adjusting initial fetch limit
- `src/app/layout.js` - Consider adding preload hints
- `next.config.mjs` - Image optimization settings (already good)
- `src/app/globals.css` - CSS-level optimizations needed

## Next Steps
1. ✅ Added `fetchpriority="high"` + `loading="eager"`
2. Run Lighthouse test to measure improvement
3. If still > 3s, implement additional strategies from "High Priority" section
4. Monitor resource load delay specifically
