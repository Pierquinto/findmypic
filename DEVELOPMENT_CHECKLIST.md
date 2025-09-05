# FindMyPic - Development Checklist

## 🚀 Pre-Development Setup

### Before Making ANY Changes

- [ ] **Read PRODUCTION_SETUP.md** - Understand current working configuration
- [ ] **Read AUTHENTICATION_ARCHITECTURE.md** - Understand auth flow
- [ ] **Create feature branch** - Never work directly on main
  ```bash
  git checkout -b feature/your-change-name
  ```
- [ ] **Backup current state** - Note current commit hash
  ```bash
  git log --oneline -1
  ```

## 🧪 Local Development Checklist

### Environment Setup
- [ ] **Verify .env.local exists** with all required variables
- [ ] **Database connection works** locally
  ```bash
  npm run dev
  # Test: http://localhost:3000
  ```
- [ ] **Authentication works** locally
  - [ ] User registration
  - [ ] User login  
  - [ ] Protected routes
  - [ ] Admin access (if applicable)

### Code Quality
- [ ] **TypeScript compiles** without errors
  ```bash
  npx tsc --noEmit
  ```
- [ ] **Build succeeds** locally
  ```bash
  npm run build
  ```
- [ ] **No console errors** in development
- [ ] **Database migrations** (if schema changed)
  ```bash
  npx prisma db push
  ```

## 🔧 Safe Modification Guidelines

### ⚠️ HIGH RISK - Modify with Extreme Caution

**Database Connection** (`src/lib/prisma.ts`):
- [ ] **Do not change** `POSTGRES_PRISMA_URL` logic
- [ ] **Test extensively** if modifying database config
- [ ] **Verify health check passes**: `/api/debug-supabase-connection`

**Authentication System** (`src/lib/auth/`):
- [ ] **Preserve JWT validation** logic
- [ ] **Maintain user profile structure**
- [ ] **Test all auth flows** after changes
- [ ] **Verify API authentication** still works

**Middleware** (`src/middleware.ts`):
- [ ] **Test route protection** for all protected paths
- [ ] **Verify admin routes** require admin access
- [ ] **Check redirect logic** works correctly

**API Routes** (`src/app/api/`):
- [ ] **Maintain auth patterns** (getCurrentUser, requireAuth, requireAdmin)
- [ ] **Preserve error handling** structure
- [ ] **Test authenticated endpoints** after changes

### 🟡 MEDIUM RISK - Test Thoroughly

**Environment Variables**:
- [ ] **Do not remove** existing production variables
- [ ] **Test locally** before deploying
- [ ] **Document new variables** in setup docs

**Dependencies** (`package.json`):
- [ ] **Check compatibility** with Next.js 15
- [ ] **Test build process** after updates
- [ ] **Verify Prisma** still works correctly

**Database Schema** (`prisma/schema.prisma`):
- [ ] **Create migration** for schema changes
- [ ] **Test with existing data**
- [ ] **Backup production data** before major changes

### 🟢 LOW RISK - Safe to Modify

**UI Components** (`src/components/`):
- [ ] **Test responsive design**
- [ ] **Check accessibility**
- [ ] **Verify styling** across pages

**Page Components** (`src/app/`):
- [ ] **Maintain authentication checks** where needed
- [ ] **Test user flows**
- [ ] **Verify SEO metadata**

**Styling** (`tailwind.css`, component styles):
- [ ] **Test responsive breakpoints**
- [ ] **Check dark mode** (if implemented)
- [ ] **Verify component consistency**

## 🚦 Pre-Deployment Checklist

### Local Testing (Required)
- [ ] **All TypeScript compiles** without errors
- [ ] **Build completes** successfully
  ```bash
  npm run build && npm start
  ```
- [ ] **Authentication flows** work correctly
- [ ] **Database operations** function properly
- [ ] **Image upload/search** works (core functionality)
- [ ] **Admin panel** accessible (for admin users)
- [ ] **No console errors** in production build

### Code Review
- [ ] **Review changes** carefully
- [ ] **No sensitive data** exposed in code
- [ ] **Environment variables** properly used
- [ ] **Error handling** implemented
- [ ] **Logging** appropriate for debugging

### Git Workflow
- [ ] **Commit messages** are descriptive
- [ ] **No large files** committed (images, builds, etc.)
- [ ] **.gitignore** properly configured
- [ ] **Clean git history** (squash commits if needed)

## 🚀 Deployment Process

### Vercel Preview Deployment
- [ ] **Push to feature branch** triggers preview deployment
- [ ] **Test preview URL** thoroughly
- [ ] **Check Vercel logs** for any errors
- [ ] **Environment variables** applied correctly

### Production Deployment (Main Branch)
- [ ] **Create PR** from feature branch to main
- [ ] **Review changes** one final time
- [ ] **Merge to main** (triggers production deployment)
- [ ] **Monitor deployment** in Vercel dashboard

### Post-Deployment Verification
- [ ] **Website loads** without errors: https://www.findmypic.app
- [ ] **Health check passes**:
  ```bash
  curl https://www.findmypic.app/api/debug-supabase-connection
  # Expected: {"tests":{"database":{"success":true}}}
  ```
- [ ] **Authentication works**:
  ```bash
  curl https://www.findmypic.app/api/user/profile
  # Expected: {"error":"Accesso non autorizzato"} (not connection error)
  ```
- [ ] **Core functionality** works (test manually)
- [ ] **Check Vercel logs** for any runtime errors

## 🆘 Rollback Procedures

### If Something Breaks

**Immediate Actions**:
1. **Check Vercel logs** for error details
2. **Revert to previous deployment** in Vercel dashboard
3. **Document the issue** in git commit or issue

**Investigation Steps**:
1. **Compare with last working commit**
   ```bash
   git diff HEAD~1 HEAD
   ```
2. **Check environment variables** haven't changed
3. **Verify integrations** (Vercel-Supabase) still active
4. **Test health check endpoints**

**Recovery Process**:
1. **Fix issue** in feature branch
2. **Test thoroughly** locally
3. **Deploy to preview** first
4. **Only merge to main** after verification

## 📊 Health Monitoring

### Daily/Weekly Checks
- [ ] **Website accessibility**: https://www.findmypic.app
- [ ] **Database connection**: `/api/debug-supabase-connection`
- [ ] **User registration/login** flows
- [ ] **Image search functionality**
- [ ] **Admin panel access**

### Performance Monitoring
- [ ] **Vercel analytics** for response times
- [ ] **Console logs** for any warning patterns
- [ ] **Database query performance** (if available)
- [ ] **Storage usage** (Cloudflare R2)

### Security Monitoring
- [ ] **No exposed credentials** in logs
- [ ] **JWT tokens** expiring correctly
- [ ] **Rate limiting** working (if implemented)
- [ ] **HTTPS** enforced on all endpoints

## 📝 Documentation Updates

### When to Update Docs
- [ ] **New environment variables** added
- [ ] **Authentication flow** changes
- [ ] **API endpoints** added/modified
- [ ] **Deployment process** changes
- [ ] **Troubleshooting** new issues found

### Documentation Files to Maintain
- [ ] **PRODUCTION_SETUP.md** - Overall configuration
- [ ] **AUTHENTICATION_ARCHITECTURE.md** - Auth system details
- [ ] **This file** - Development processes
- [ ] **README.md** - Project overview
- [ ] **API documentation** (if separate)

---

## 🎯 Success Criteria

**A change is ready for production when**:
✅ All checklist items completed
✅ Local testing passes completely
✅ Preview deployment works correctly
✅ No breaking changes to existing functionality
✅ Documentation updated if needed
✅ Rollback plan identified

**Remember**: This app is working in production. The burden of proof is on new changes to maintain that status.

---

**📞 Emergency Contact**: Check git blame or commit history for context on any specific implementation decisions.