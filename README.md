# 🔍 FindMyPic

**Proteggi la tua privacy digitale** - Scopri se le tue foto sono state pubblicate online senza il tuo consenso.

[![Production Status](https://img.shields.io/badge/Production-✅%20Live-green)](https://www.findmypic.app)
[![Build Status](https://img.shields.io/badge/Build-✅%20Passing-green)](#)
[![Auth System](https://img.shields.io/badge/Auth-✅%20Working-green)](#)

**🌐 Live App**: [www.findmypic.app](https://www.findmypic.app)

## 📋 Quick Start

### For Developers

1. **Read Documentation First** (CRITICAL):
   - 📖 [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Current working configuration
   - 🔐 [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) - Auth system details
   - ✅ [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md) - Safe development process

2. **Clone & Setup**:
   ```bash
   git clone https://github.com/Pierquinto/findmypic.git
   cd findmypic
   npm install
   cp .env.example .env.local  # Add your environment variables
   npm run dev
   ```

3. **Always use the checklist** before making changes to avoid breaking production.

### For Users

1. **Visit**: [www.findmypic.app](https://www.findmypic.app)
2. **Register** for an account
3. **Upload** your images
4. **Search** the web for unauthorized usage
5. **Protect** your privacy

## 🏗️ Architecture

```
Next.js 15.5.2 (Frontend)
    ↓
Vercel (Serverless Hosting)
    ↓
Supabase (Auth + PostgreSQL Database)
    ↓
Cloudflare R2 (Image Storage)
    ↓
Google Vision API (Reverse Image Search)
```

## ⚡ Features

### ✅ Currently Working
- 🔐 **User Authentication** (Supabase Auth)
- 👤 **User Profiles & Management**
- 📸 **Image Upload** (Cloudflare R2)
- 🔍 **Reverse Image Search** (Google Vision API)
- 📊 **Admin Dashboard** 
- 📱 **Responsive Design**
- 🛡️ **Route Protection & Role-based Access**
- 💳 **Subscription Management**
- 📈 **Usage Analytics**
- ⚖️ **Violation Detection & Reporting**

### 🔒 Security Features
- JWT-based authentication
- Server-side user validation
- Protected API endpoints
- Admin-only routes
- Secure image storage
- Privacy-first design

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5.2** with Turbopack
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide Icons**

### Backend
- **Vercel Serverless Functions**
- **Prisma ORM**
- **PostgreSQL** (Supabase)

### Authentication
- **Supabase Auth** (JWT-based)
- **Server-side validation**
- **Role-based access control**

### Storage & APIs
- **Cloudflare R2** (Image storage)
- **Google Vision API** (Image search)
- **Supabase** (Database)

## 🚀 Production Status

### ✅ Working Configuration
- **URL**: https://www.findmypic.app
- **Database**: ✅ Connected via Vercel-Supabase integration
- **Authentication**: ✅ Full JWT-based auth system
- **File Upload**: ✅ Cloudflare R2 integration
- **Search Engine**: ✅ Google Vision API integration
- **Admin Panel**: ✅ Role-based admin access

### 📊 Health Checks
```bash
# Database connectivity
curl https://www.findmypic.app/api/debug-supabase-connection

# Authentication system (should return 401 for unauthorized)
curl https://www.findmypic.app/api/user/profile
```

## 🔧 Development

### ⚠️ CRITICAL - Read Before Modifying

**This app is LIVE in production**. Before making any changes:

1. **READ**: [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md)
2. **UNDERSTAND**: [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) 
3. **FOLLOW**: The safe development process
4. **TEST**: Everything locally before deploying

### Local Development Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Add your Supabase, Google Vision API, and Cloudflare R2 credentials

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (local development)
DATABASE_URL=your-postgres-connection-string

# Google Vision API
GOOGLE_VISION_API_KEY=your-vision-api-key

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=your-public-url

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API endpoints
│   ├── admin/             # Admin panel pages
│   ├── dashboard/         # User dashboard
│   └── (auth)/            # Auth pages
├── components/            # Reusable UI components
├── lib/                   # Core utilities
│   ├── auth/             # Authentication system
│   ├── supabase/         # Supabase clients
│   └── prisma.ts         # Database client
├── hooks/                # Custom React hooks
└── utils/                # Helper functions

prisma/
└── schema.prisma         # Database schema

docs/                     # Documentation
├── PRODUCTION_SETUP.md
├── AUTHENTICATION_ARCHITECTURE.md
└── DEVELOPMENT_CHECKLIST.md
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration/login
- [ ] Image upload functionality  
- [ ] Reverse image search
- [ ] Admin panel access (admin users)
- [ ] User profile management
- [ ] Subscription system
- [ ] Responsive design

### API Testing
```bash
# Health check
curl https://www.findmypic.app/api/debug-supabase-connection

# Authentication (should return 401)
curl https://www.findmypic.app/api/user/profile

# With auth token
curl -H "Authorization: Bearer YOUR_TOKEN" https://www.findmypic.app/api/user/profile
```

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) | Complete production configuration & troubleshooting |
| [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) | Auth system implementation details |
| [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md) | Safe development & deployment process |

## 🚨 Emergency Procedures

### If Production Breaks
1. **Check Vercel logs** immediately
2. **Revert deployment** in Vercel dashboard  
3. **Investigate** using health check endpoints
4. **Follow** rollback procedures in development checklist

### Common Issues
- **401 Errors**: Usually auth config - check [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md)
- **Database Connection**: Check Vercel-Supabase integration - see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
- **Build Failures**: Usually Prisma client - ensure `prisma generate` runs

## 🤝 Contributing

1. **Read all documentation** first
2. **Create feature branch** - never work on main
3. **Follow checklist** for all changes
4. **Test thoroughly** locally
5. **Use preview deployments** before merging
6. **Update documentation** if needed

## 📄 License

Proprietary - All rights reserved.

## 📞 Support

- **Documentation**: Check the docs/ folder first
- **Issues**: Create GitHub issue with full context
- **Emergency**: Check git history for implementation context

---

**⚠️ Remember**: This is a live production application. All changes must maintain the working status. When in doubt, refer to the documentation and test extensively.**