# Configurazione Variabili d'Ambiente - FindMyPic

## Variabili Obbligatorie per il Server Remoto

### Database
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Google Vision API (Opzionale)
```bash
GOOGLE_VISION_API_KEY="your-google-vision-api-key"
```

### Cloudflare R2 (Opzionale)
```bash
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-bucket-name"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
```

## Come Verificare la Configurazione

1. **Endpoint di Debug**: Visita `https://your-domain.com/api/debug-server`
2. **Endpoint Base**: Visita `https://your-domain.com/api/debug-env`

## Problemi Comuni

### Errori 500
- **Database**: Verifica che `DATABASE_URL` sia corretto e che il database sia accessibile
- **Supabase**: Verifica che tutte le chiavi Supabase siano configurate correttamente
- **Auth**: Gli errori di autenticazione sono spesso causati da chiavi Supabase mancanti o errate

### Errori di Connessione
- Verifica che il database PostgreSQL sia in esecuzione
- Verifica che le credenziali del database siano corrette
- Verifica che il firewall permetta le connessioni al database

## Checklist Pre-Deploy

- [ ] `DATABASE_URL` configurato e testato
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurato
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurato
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurato
- [ ] Database PostgreSQL accessibile dal server
- [ ] Supabase project configurato correttamente
- [ ] Test endpoint `/api/debug-server` funzionante
