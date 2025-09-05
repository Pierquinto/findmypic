# FindMyPic - Production Setup Documentation

## ✅ Current Working Configuration

**Status**: ✅ FUNZIONANTE in produzione (Vercel + Supabase)
**Last Updated**: 2025-09-05
**Deployment URL**: https://www.findmypic.app

## 🏗️ Architecture Overview

```
Frontend (Next.js 15.5.2) 
    ↓
Vercel Serverless Functions
    ↓
Supabase Auth + PostgreSQL
    ↓
Cloudflare R2 (Image Storage)
    ↓
Google Vision API (Image Search)
```

## 🔧 Critical Configuration

### 1. Database Connection (✅ WORKING)

**⚠️ DO NOT CHANGE** - This configuration is working:

```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  datasources: {
    db: {
      // Uses Vercel's Supabase integration URL in production
      url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
    }
  }
})
```

**Environment Variables on Vercel**:
- `POSTGRES_PRISMA_URL` - ✅ Auto-configured by Vercel-Supabase integration
- `POSTGRES_URL` - ✅ Auto-configured by Vercel-Supabase integration  
- `DATABASE_URL` - ⚠️ Keep for local development only

### 2. Authentication System (✅ WORKING)

**Supabase Auth Configuration**:
- `NEXT_PUBLIC_SUPABASE_URL`: https://kxcenxzibosbtmedhjez.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ✅ Set via Vercel integration
- `SUPABASE_SERVICE_ROLE_KEY`: ✅ Set via Vercel integration

**Auth Flow**:
1. Client: `src/lib/auth/client.tsx` - React context + Supabase client
2. Server: `src/lib/auth/server.ts` - JWT validation + user lookup
3. Middleware: `src/middleware.ts` - Route protection
4. API Auth: Uses `useApiRequest` hook for authenticated requests

### 3. API Architecture (✅ WORKING)

**Authentication Pattern**:
```typescript
// Client-side authenticated requests
const apiRequest = useApiRequest()
const response = await apiRequest('/api/user/profile')
```

**Server-side validation**:
```typescript
// All API routes use this pattern
const user = await getCurrentUser(request)
if (!user) return unauthorized()
```

## 🚀 Deployment Process

### Vercel Configuration

**Required Integrations**:
1. ✅ **Supabase Integration** - Auto-configures all DB variables
2. ✅ **Environment Variables** - See section below

**Build Settings**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

### Environment Variables

**Production (Vercel) - Auto-configured by integrations**:
```bash
# Database (Supabase Integration)
POSTGRES_URL=auto-configured
POSTGRES_PRISMA_URL=auto-configured
POSTGRES_URL_NON_POOLING=auto-configured
POSTGRES_USER=auto-configured
POSTGRES_HOST=auto-configured
POSTGRES_PASSWORD=auto-configured
POSTGRES_DATABASE=auto-configured

# Supabase (Supabase Integration)  
SUPABASE_URL=auto-configured
SUPABASE_ANON_KEY=auto-configured
SUPABASE_SERVICE_ROLE_KEY=auto-configured
SUPABASE_JWT_SECRET=auto-configured
NEXT_PUBLIC_SUPABASE_URL=auto-configured
NEXT_PUBLIC_SUPABASE_ANON_KEY=auto-configured

# Manual Configuration Required
GOOGLE_VISION_API_KEY=your-api-key
ENCRYPTION_KEY=your-encryption-key
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key  
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=findmypic
R2_PUBLIC_URL=your-r2-public-url
```

**Local Development (.env.local)**:
```bash
DATABASE_URL="postgresql://postgres:password@db.xyz.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"
# ... other vars
```

## 🔍 Monitoring & Debugging

### Health Check Endpoints

**Database Connection**:
```bash
curl https://www.findmypic.app/api/debug-supabase-connection
# Expected: {"tests":{"database":{"success":true}}}
```

**Authentication Flow**:
```bash
curl https://www.findmypic.app/api/user/profile
# Expected: {"error":"Accesso non autorizzato"} (NOT connection error)
```

### Log Monitoring

**Key Log Patterns**:
- `[AUTH]` - Authentication flow logs
- `[API]` - API request logs  
- `[SUPABASE-DEBUG]` - Database connection logs
- `[SEARCH]` - Image search operations

## ⚠️ Critical Dependencies

### Package.json - DO NOT MODIFY without testing

**Key Dependencies**:
```json
{
  "@supabase/ssr": "^0.5.1",
  "@supabase/supabase-js": "^2.39.0", 
  "@prisma/client": "5.22.0",
  "prisma": "^5.22.0",
  "next": "^15.5.2",
  "pg": "^8.11.3"
}
```

### Database Schema - Prisma

**Critical Models**:
- `User` - Links to Supabase auth
- `Search` - Image search history  
- `SearchResult` - Search results
- `Violation` - Detected violations

## 🛠️ Troubleshooting Guide

### Common Issues & Solutions

**1. Database Connection Errors**
```
Error: Can't reach database server
```
**Solution**: Verify Vercel-Supabase integration is active

**2. Authentication 401 Errors**  
```
{"error":"Accesso non autorizzato"}
```
**Solution**: Normal behavior for unauthenticated requests

**3. Build Failures**
```
Prisma Client not found
```
**Solution**: Ensure `prisma generate` runs in build process

### Deployment Checklist

**Before any changes**:
- [ ] Test locally with `npm run dev`
- [ ] Run `npm run build` successfully
- [ ] Verify all environment variables exist
- [ ] Test authentication flow
- [ ] Check database connectivity

**After deployment**:
- [ ] Test health check endpoints
- [ ] Verify authentication works
- [ ] Check logs for errors
- [ ] Test core functionality (image upload, search)

## 📝 Development Workflow

### Safe Modification Process

1. **Always work on branches**
   ```bash
   git checkout -b feature/your-change
   ```

2. **Test locally first**
   ```bash
   npm run dev
   npm run build
   ```

3. **Deploy to preview branch**
   - Vercel auto-deploys branches
   - Test preview URL thoroughly

4. **Merge only after verification**
   ```bash
   git checkout main
   git merge feature/your-change
   ```

### Key Files - Modify with Caution

**Critical Files (high risk)**:
- `src/lib/prisma.ts` - Database connection
- `src/lib/auth/` - Authentication system
- `src/middleware.ts` - Route protection
- `prisma/schema.prisma` - Database schema

**Safe to modify**:
- UI components in `src/components/`
- Page components in `src/app/`
- Styling files

## 🎯 Success Metrics

**Production Health Indicators**:
- ✅ https://www.findmypic.app loads without errors
- ✅ Database health check returns success
- ✅ User registration/login works
- ✅ Image upload and search functions
- ✅ Admin panel accessible to admin users
- ✅ No 401 errors from database connection issues

---

**⚠️ REMEMBER**: This configuration is working in production. Any changes to database connection, authentication, or core architecture should be thoroughly tested before deployment.

**📞 Support**: Check git history for context on any issues that arise.