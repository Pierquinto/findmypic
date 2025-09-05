# Vercel Database Connection Fix

## Problem
Your app works locally but returns 401 Unauthorized errors in production on Vercel. This is because the database connection configuration is optimized for local development, not serverless environments.

## Root Cause
The current `DATABASE_URL` uses connection pooling (`pgbouncer=true&connection_limit=1`) which can cause issues in Vercel's serverless environment where:
- Functions are stateless and short-lived
- Connection pooling can timeout or fail to establish properly
- Each API call creates a new process that needs to connect to the database

## Solution Steps

### 1. Update Vercel Environment Variables
Log into your Vercel dashboard and update these environment variables:

**Replace this (current):**
```
DATABASE_URL=postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

**With this (recommended for production):**
```
DATABASE_URL=postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres
```

### 2. Alternative Options (if direct connection doesn't work)

**Option A: Use pooled port (6543)**
```
DATABASE_URL=postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:6543/postgres
```

**Option B: Connection pooling with timeout**
```
DATABASE_URL=postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1&connect_timeout=15&pool_timeout=20
```

### 3. Verify Other Environment Variables
Make sure these are also set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_VISION_API_KEY`
- `ENCRYPTION_KEY`
- All R2 variables

### 4. Redeploy
After updating the environment variables, trigger a new deployment.

### 5. Test the Fix
Visit these endpoints to verify the fix:
- `https://your-app.vercel.app/api/debug-supabase-connection` - Should show successful database connection
- `https://your-app.vercel.app/api/user/profile` - Should return user data instead of 401

## Why This Fixes the Issue

1. **Direct Connection**: Eliminates connection pooling overhead in serverless environment
2. **Simplified Configuration**: Reduces potential points of failure
3. **Better Serverless Compatibility**: Direct connections work better with Vercel's ephemeral functions

## Local Development
Your local development will continue to work with either configuration, so you can keep using the pooled connection locally if preferred.

## Monitoring
After deployment, check:
- API response times (should be similar or better)
- Error logs (should eliminate database connection errors)
- Authentication flows (should work properly)