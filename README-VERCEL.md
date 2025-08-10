# OTIS APROD - Vercel Deployment Guide

## 🚀 Migráció Replit-ről Vercel-re

Ez a dokumentum leírja, hogyan telepítsd a OTIS APROD alkalmazást Vercel-re a Replit környezetből.

### 📋 Előfeltételek

1. **Vercel fiók** - https://vercel.com
2. **GitHub repository** - kód feltöltése GitHub-ra
3. **PostgreSQL adatbázis** - Neon, Supabase vagy más provider
4. **Environment változók** - lásd alább

### 🔧 Vercel Konfigurációs Fájlok

#### 1. `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "src": "/(.*)", "dest": "/client/dist/$1" }
  ]
}
```

#### 2. `api/index.ts` 
Vercel serverless function wrapper a Express backend számára.

### 🌍 Environment Változók (Vercel Dashboard)

```bash
# Adatbázis
DATABASE_URL=postgresql://username:password@host:5432/database
PGHOST=your-postgres-host
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=your-database

# Alkalmazás
NODE_ENV=production
SESSION_SECRET=your-session-secret-key

# Opcionális - Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 📦 Telepítési Lépések

#### 1. GitHub Repository Létrehozása
```bash
git init
git add .
git commit -m "Initial commit - OTIS APROD v0.4.8"
git branch -M main
git remote add origin https://github.com/your-username/otis-aprod.git
git push -u origin main
```

#### 2. Vercel Projekt Létrehozása
1. Menj a https://vercel.com/dashboard
2. Kattints az "Import Project" gombra
3. Válaszd ki a GitHub repository-t
4. Állítsd be a környezeti változókat

#### 3. Build Beállítások
- **Framework Preset**: Other
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `client/dist`
- **Install Command**: `npm install`

#### 4. Adatbázis Migráció
```bash
# Helyi környezetben
npm install -g drizzle-kit
npx drizzle-kit push --config=drizzle.config.ts
```

### 🔄 CI/CD Pipeline

Vercel automatikusan újratelepíti az alkalmazást minden GitHub push után:
- **Production**: main branch
- **Preview**: feature branchek
- **Development**: automatikus preview URL-ek

### 📱 PWA Támogatás

A PWA funkciók Vercel-en is működnek:
- Service Worker (`public/sw.js`)
- Web App Manifest (`public/manifest.json`)
- Offline támogatás
- Installálhatóság mobilon/asztali gépen

### 🔐 Biztonság

#### Headers Konfigurálás (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### 📊 Monitoring & Analytics

Vercel beépített monitoring:
- **Function Logs**: Serverless function hibák
- **Analytics**: Teljesítmény metrikák  
- **Speed Insights**: Core Web Vitals
- **Real User Monitoring**: Valós felhasználói adatok

### 🐛 Hibakeresés

#### Gyakori Problémák

1. **Build Hibák**
   ```bash
   # Ellenőrizd a build logokat
   npm run client:build
   ```

2. **API Route Problémák**  
   ```bash
   # Tesztelj lokálisan
   npm run dev
   ```

3. **Adatbázis Kapcsolat**
   ```bash
   # Ellenőrizd a connection stringet
   echo $DATABASE_URL
   ```

### 🚀 Go-Live Checklist

- [ ] GitHub repository feltöltve
- [ ] Vercel projekt létrehozva
- [ ] Environment változók beállítva
- [ ] Adatbázis migráció lefuttatva
- [ ] Build sikeres
- [ ] PWA funkciók tesztelve
- [ ] Mobil kompatibilitás ellenőrizve
- [ ] HTTPS domain beállítva
- [ ] Custom domain (opcionális)

### 📞 Támogatás

**OTIS APROD v0.4.8**
- PWA támogatás ✅
- Measurement persistence ✅  
- Excel generation ✅
- PDF export ✅
- Multilingual (HU/DE) ✅
- Mobile optimized ✅

**Vercel Deploy URL**: `https://your-app.vercel.app`