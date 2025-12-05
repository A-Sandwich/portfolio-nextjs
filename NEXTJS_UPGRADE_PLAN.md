# Next.js Security Update - Upgrade Plan

## Current Status
- **Current Version**: Next.js 14.2.5
- **Target Version**: Next.js 16.0.7 (latest stable)
- **Reason**: Address remote shell security vulnerability

## Version Jump Analysis
This is a **major version upgrade** (14.x → 16.x), which skips Next.js 15 entirely and includes breaking changes.

## Pre-Upgrade Checklist

### 1. Backup and Safety
- [ ] Create a new git branch for the upgrade
- [ ] Ensure current code is committed
- [ ] Document current working state
- [ ] Run and verify current build works: `npm run build`
- [ ] Test current dev server: `npm run dev`

### 2. Dependency Audit
- [ ] Check all dependencies for Next.js 16 compatibility:
  - `react` (currently ^18.3.1) - ✅ Compatible
  - `react-dom` (currently ^18.3.1) - ✅ Compatible
  - `eslint-config-next` (currently ^14.2.5) - ❗ Needs update to ^16.0.7
  - `@supabase/supabase-js` (^2.45.0) - Verify compatibility
  - `swr` (^2.2.5) - Verify compatibility

### 3. Review Breaking Changes
Review official Next.js migration guides:
- Next.js 15: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- Next.js 16: https://nextjs.org/docs/app/building-your-application/upgrading/version-16

## Known Breaking Changes to Address

### Next.js 15 Breaking Changes (included in 16)
1. **Minimum React version**: React 19 required
2. **Fetch caching**: Default changed from cached to uncached
3. **Route handlers**: GET handlers no longer cached by default
4. **Client-side router cache**: Page components no longer cached by default
5. **Incremental cache configuration**: New API for custom cache handlers

### Next.js 16 Breaking Changes
1. **Pages Router deprecation warnings**: Encouraged to migrate to App Router
2. **Image optimization changes**: Updated defaults and behavior
3. **Middleware changes**: Enhanced edge runtime capabilities
4. **Turbopack**: May be enabled by default for dev mode

## Upgrade Execution Steps

### Phase 1: Update Dependencies
```bash
# Update Next.js and related packages
npm install next@latest react@latest react-dom@latest

# Update ESLint config
npm install eslint-config-next@latest

# Check for dependency conflicts
npm audit
```

### Phase 2: Code Migration

#### A. Update package.json engines (if needed)
- Verify Node.js version compatibility (current: >=18.15.0)
- Next.js 16 requires Node.js 18.18.0 or later

#### B. Review and Update API Routes
**Files to check:**
- [pages/api/recent-tracks.js](pages/api/recent-tracks.js)

**Actions:**
- Review fetch() calls - default caching behavior changed
- Add explicit cache configuration if needed:
  ```javascript
  fetch(url, { cache: 'force-cache' }) // for cached
  fetch(url, { cache: 'no-store' })    // for dynamic
  ```

#### C. Review Dynamic Routes
**Files to check:**
- [pages/posts/[id].js](pages/posts/[id].js)

**Actions:**
- Verify getStaticProps/getStaticPaths still work correctly
- Test dynamic route generation

#### D. Review _app.js and _document.js
**Files to check:**
- [pages/_app.js](pages/_app.js)
- [pages/_document.js](pages/_document.js)

**Actions:**
- Ensure custom App and Document work with new version
- Check for deprecated patterns

#### E. Review Component Patterns
**Files to check:**
- [pages/components/recent-track.jsx](pages/components/recent-track.jsx)
- [components/date.js](components/date.js)

**Actions:**
- Check for any React 19 incompatibilities
- Update deprecated React patterns if any

### Phase 3: Configuration Updates

#### A. Create/Update next.config.js (if needed)
Create [next.config.js](next.config.js) with appropriate settings:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any custom configuration
  reactStrictMode: true,
  // Opt-in to new behaviors or opt-out of breaking changes
}

module.exports = nextConfig
```

#### B. Update Build Configuration
- Review any custom build scripts in package.json
- Test production build process

### Phase 4: Testing

#### A. Development Testing
```bash
# Start dev server
npm run dev

# Test all routes:
# - Homepage
# - Dynamic post routes
# - API endpoints
# - Static assets (games in /public/games/)
```

#### B. Build Testing
```bash
# Clean install
rm -rf .next node_modules package-lock.json
npm install

# Production build
npm run build

# Test production server
npm start
```

#### C. Functionality Testing
- [ ] Verify all pages render correctly
- [ ] Test recent-tracks API endpoint
- [ ] Test blog post routes ([id] dynamic routing)
- [ ] Verify Godot games load correctly
- [ ] Check image optimization
- [ ] Test date formatting component
- [ ] Verify Supabase integration works
- [ ] Test SWR data fetching

### Phase 5: Performance Verification
- [ ] Compare build output size (before vs after)
- [ ] Check lighthouse scores
- [ ] Verify no console errors/warnings
- [ ] Test page load times
- [ ] Verify hot reload in dev mode

## Rollback Plan

If issues arise:
```bash
# Revert to previous branch
git checkout main

# Or revert package.json and reinstall
npm install next@14.2.5 eslint-config-next@14.2.5
npm install
```

## Post-Upgrade Tasks

### 1. Update Documentation
- [ ] Update README if it references Next.js version
- [ ] Document any configuration changes made
- [ ] Update deployment documentation if needed

### 2. CI/CD Updates
- [ ] Update CI/CD pipeline Node.js version if needed
- [ ] Update deployment platform Next.js version
- [ ] Verify build scripts still work

### 3. Monitoring
- [ ] Monitor application for errors after deployment
- [ ] Check server logs for deprecation warnings
- [ ] Track performance metrics

## Estimated Timeline
- **Preparation**: 15-30 minutes
- **Upgrade execution**: 30-45 minutes
- **Testing**: 1-2 hours
- **Total**: 2-3 hours

## Resources
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Next.js GitHub Releases](https://github.com/vercel/next.js/releases)
- [Next.js Security Advisories](https://github.com/vercel/next.js/security/advisories)

## Notes
- This project uses the **Pages Router** (not App Router)
- No TypeScript configuration to update
- Project structure is relatively simple, reducing migration complexity
- Main risk areas: API routes, dynamic routing, and third-party integrations

## Success Criteria
- ✅ Application builds without errors
- ✅ All pages render correctly
- ✅ API endpoints function properly
- ✅ No console errors or warnings
- ✅ Performance metrics maintained or improved
- ✅ All Godot games load successfully
- ✅ Supabase and SWR integrations work correctly
