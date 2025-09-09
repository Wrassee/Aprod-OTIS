# OTIS APRO - Acceptance Protocol Application v0.1.2

[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](./VERSION)
[![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)]()
[![Language](https://img.shields.io/badge/language-Hungarian%20%7C%20German-blue.svg)]()

**Digitális lift átvételi protokoll alkalmazás OTIS technikusi környezetekhez**

## 🚀 Gyors Áttekintés

Az OTIS APRO egy tablet-optimalizált, teljes körű TypeScript alkalmazás, amely digitalizálja a lift átvételi protokoll folyamatot. A rendszer lépésről lépésre vezeti a felhasználót a kérdőíven keresztül, lehetővé teszi a hibák dokumentálását képekkel, Excel fájlokat generál és támogatja a magyar és német nyelvet.

## ✨ Főbb Funkciók

### 📋 Protokoll Kezelés
- **Többlépéses kérdőív**: 10 kérdéses átvételi protokoll
- **Dinamikus kérdések**: Excel sablonokból betöltött konfigurálható kérdések
- **Valós idejű validáció**: Azonnali adatmentés és ellenőrzés
- **Digitális aláírás**: Vászon alapú aláírás rögzítés

### 📊 Excel Integráció
- **XML-alapú manipuláció**: 100%-os formázás megőrzés
- **Unicode támogatás**: Tökéletes magyar karakter megjelenítés
- **Sablon kezelés**: Feltöltés, aktiválás, váltás
- **Cella leképezés**: Pontos adatbevitel meghatározott cellákba

### 🌐 Többnyelvűség
- **Magyar nyelv**: Teljes felhasználói felület
- **Német nyelv**: Komplett fordítási támogatás
- **Dinamikus váltás**: Futás közbeni nyelvváltás

### 💾 Adatkezelés
- **PostgreSQL adatbázis**: Neon serverless integráció
- **LocalStorage**: Offline adatmentés
- **Fájlkezelés**: Excel template tárolás és kezelés

## 🛠️ Technológiai Stack

### Frontend
- **React 18** + TypeScript
- **Vite** fejlesztői környezet
- **TailwindCSS** + Shadcn/ui komponensek
- **TanStack Query** szerver állapot kezelés
- **Wouter** kliens oldali routing

### Backend  
- **Node.js** + Express.js
- **Drizzle ORM** + PostgreSQL
- **Multer** fájl feltöltés
- **Zod** séma validáció

### Integráció
- **XLSX** Excel fájl manipuláció
- **JSZip** ZIP fájl kezelés
- **XML Parser** formázás megőrzés

## 🚦 Használat

### Fejlesztői Indítás
```bash
npm run dev
```

### Adatbázis Séma Frissítés  
```bash
npm run db:push
```

### Production Build
```bash
npm run build
npm run start
```

## 📱 Felhasználói Útmutató

1. **Nyelv választás**: Magyar vagy német interfész
2. **Kérdőív kitöltése**: Lépésről lépésre haladás
3. **Hibák dokumentálása**: Opcionális hibajelentés súlyossággal
4. **Aláírás rögzítése**: Digitális aláírás + nyomtatott név
5. **Protokoll generálás**: Excel fájl letöltése eredeti formázással

## 👨‍💼 Admin Funkciók

### Template Kezelés
- Excel sablonok feltöltése
- Kérdés konfigurációk szerkesztése  
- Aktív sablon váltása
- Fájlok törlése

### Cella Leképezés
Az alábbi Excel cellák automatikusan töltődnek:
- `F9`: Átvevő neve
- `Q9`: Cím
- `G13`: Telefonszám
- `O13-O19`: Egyéb protokoll adatok
- `A68`: Aláírás

## 🎯 Verzió 0.1.0 Eredmények

✅ **Stabilitás**: Teljes UI stabilizálás, nincs kurzor ugrás  
✅ **Excel Integráció**: 100%-os formázás megőrzés XML manipulációval  
✅ **Adatbázis**: PostgreSQL WebSocket optimalizálás  
✅ **Többnyelvűség**: Magyar és német nyelvi támogatás  
✅ **Template Kezelés**: Komplett admin felület  
✅ **Végpontok közötti munkafolyamat**: Kérdőívtől az Excel generálásig  

## 📈 Következő Verzió (0.2.0)

- PDF generálás Excel sablonokból
- Email küldési rendszer 
- Felhő tárolási integráció
- Kiterjesztett hibajelentés képekkel
- Felhasználói jogosultság kezelés

## 🔧 Fejlesztői Jegyzetek

- **UI Stabilizálás**: Natív DOM manipuláció a React állapot helyett
- **Cache Stratégia**: Globális Map cache rádiógombokhoz
- **XML Megközelítés**: Közvetlen XML string manipulation Excel-ben
- **Adatbázis Optimalizálás**: Connection pooling és timeout kezelés

---

**Fejlesztve**: OTIS technikai csapat számára  
**Licenc**: Proprietary  
**Státusz**: Production Ready 🟢