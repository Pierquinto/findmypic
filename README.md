# FindMyPic - App Reverse Image Search per Privacy

FindMyPic è un'app Next.js 14 progettata per aiutare content creator e vittime di revenge porn a trovare le loro foto pubblicate online senza consenso.

## 🚀 Features Implementate

### ✅ Core Features
- **Landing Page** con hero "Proteggi la tua privacy digitale"
- **Upload Immagini** con drag&drop e preview
- **Sistema di Ricerca** con simulazione scansione (3 sec delay)
- **Mock Results** che mostrano violazioni su siti adult/social
- **Sistema Freemium** (Gratuito: 1 ricerca, Basic: €9.99/mese per 10 ricerche)
- **Autenticazione** email/password con NextAuth.js
- **Dashboard Utente** per gestire ricerche e piano
- **Pricing Page** completa con 3 piani

### 🛠 Stack Tecnologico
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (locale)
- **Auth**: NextAuth.js
- **UI**: Lucide React icons, responsive design

## 🗃 Schema Database (Prisma)

```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String
  plan     String   @default("free")
  searches Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Search   Search[]
}

model Search {
  id        String   @id @default(cuid())
  userId    String
  imageUrl  String?
  results   Json
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

## 🎯 Scenari Mock Results

L'app simula 3 scenari realistici:

1. **Scenario Violazioni**: 3 match trovati (adult-site.com, reddit.com, leak-forum.net)
2. **Scenario Pulito**: Nessuna violazione trovata
3. **Scenario Match Parziali**: 1 match con somiglianza bassa

## 🏗 Architettura delle Pagine

```
src/app/
├── page.tsx              # Landing page con hero e pricing preview
├── search/page.tsx       # Upload e ricerca immagini
├── login/page.tsx        # Pagina login con form validazione
├── register/page.tsx     # Registrazione nuovo utente
├── dashboard/page.tsx    # Dashboard utente con statistiche
├── pricing/page.tsx      # Pricing completo con FAQ
├── layout.tsx           # Layout globale con SessionProvider
├── providers.tsx        # NextAuth SessionProvider
└── api/
    ├── auth/
    │   ├── [...nextauth]/route.ts  # NextAuth handler
    │   └── register/route.ts       # Registrazione utente
    └── search/route.ts             # API ricerca con limiti freemium
```

## 🔧 Setup e Installazione

1. **Clona e installa dipendenze**:
   ```bash
   git clone <repository>
   cd findmypic
   npm install
   ```

2. **Setup database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Configura variabili ambiente** (già preconfigurate in .env):
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="findmypic-secret-key-development-only"
   ```

4. **Avvia il server**:
   ```bash
   npm run dev
   ```

5. **Visita l'app**: http://localhost:3000

## 💼 User Flow Completo

1. **Utente visita landing page** → Vede hero, features, pricing preview
2. **Click "Verifica Gratis"** → Reindirizzato a /search
3. **Upload immagine** → Drag&drop o click, preview immediata
4. **Scansione simulata** → Loading 3 secondi con progress bar
5. **Risultati mock** → Mostra violazioni trovate o "tutto pulito"
6. **Conversione freemium** → Limite raggiunto → "Aggiorna piano"
7. **Registrazione/Login** → Account gratuito o accesso esistente
8. **Dashboard** → Gestione ricerche, stats, upgrade piano

## 🎨 Design System

- **Colori**: Purple/Indigo gradient theme
- **Icone**: Lucide React (Shield, Search, Lock, etc.)
- **Layout**: Mobile-first responsive
- **Trust indicators**: Privacy badges, security messaging
- **Call-to-Actions**: Purple buttons, pricing highlights

## 🔒 Sistema Freemium

- **Free Plan**: 1 ricerca gratuita
- **Basic Plan**: €9.99/mese, 10 ricerche
- **Pro Plan**: €19.99/mese, ricerche illimitate

La logica è implementata in `/api/search/route.ts` con controlli database.

## 🧪 Testing e Validazione

L'app è pronta per validation con utenti reali:
- Form funzionanti
- Database persistente
- Session management
- Freemium limits enforcement
- Mock results realistici
- Conversion funnel completo

## 🚀 Next Steps

Per una versione production:
1. Integrare vera API reverse image search
2. Implementare pagamenti Stripe
3. Aggiungere email notifications
4. Implementare GDPR compliance
5. Adding monitoring e analytics
6. Deploy su Vercel/Railway

## 📝 Note di Sicurezza

- Password sono hashate con bcrypt
- Session JWT sicure
- Immagini non vengono salvate permanentemente
- Database locale per development
- Environment variables per secrets

L'app è stata progettata come MVP completo per dimostrare il concept e validare la domanda di mercato prima di investire nell'integrazione con servizi esterni costosi.
