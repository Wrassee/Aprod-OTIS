# OTIS APRO - Changelog

## [0.1.1] - 2025-01-27 - YES/NO/NA X-LOGIC UPDATE ✅

### ✅ Új funkció: Yes_No_NA kérdések X-alapú kezelése
- **Excel oszlop logika**: Yes_no_na típusú kérdések X-et helyeznek a megfelelő oszlopba
- **Cellakonfigurálás**: Vesszővel elválasztott cellareferencék támogatása (A68,B68,C68)
- **Automatikus leképezés**: "igen"→A oszlop, "nem"→B oszlop, "na"→C oszlop
- **Formázás megőrzés**: Eredeti Excel stílus tökéletes megőrzése X-ekkel
- **Debug támogatás**: Részletes logolás a troubleshootinghoz

### 🔧 Technikai javítások
- **Simple XML Excel Service**: Yes_no_na logika implementálása
- **Adatbázis séma**: Cell reference mező dokumentálása comma-separated formátumhoz
- **Hibakezelés**: Fallback logika helytelen cellareference formátum esetén

## [0.1.0] - 2025-01-27 - STABLE PRODUCTION RELEASE ✅

### 🎉 First Stable Release
A teljesen működőképes OTIS lift átvételi protokoll alkalmazás első stabil verziója.

### ✅ Új funkcionalitások
- **Többlépéses kérdőív**: 10 kérdéses átvételi protokoll kitöltése
- **Excel sablon kezelés**: Admin template feltöltés és aktiválás
- **Többnyelvű támogatás**: Magyar és német nyelvi interfész
- **Digitális aláírás**: Vászon alapú aláírás rögzítés névvel
- **Adatmegőrzés**: LocalStorage + PostgreSQL adatbázis integráció
- **Template aktiválás**: Egykattintásos sablon váltás rendszer

### 🔧 Technikai fejlesztések  
- **XML-alapú Excel manipuláció**: 100%-os formázás megőrzés
- **Unicode támogatás**: Magyar karakterek (ű,ő,á,é,í,ó,ü) tökéletes megjelenítése
- **Natív DOM kezelés**: Kurzor ugrás teljes megszüntetése
- **Stabil rádiógombok**: Cache alapú megoldás oldal váltás nélkül
- **Adatbázis kapcsolat**: Neon serverless WebSocket optimalizálás
- **Hibakezelés**: Átfogó error handling server indításkor

### 📊 Excel integráció tökéletesítés
- **Cella leképezés**: F9, Q9, G13, O13, G14, N14, O16, O17, O19, A68 cellák
- **Formázás megőrzés**: Eredeti OTIS stílus és formázás fenntartása
- **Template struktúra**: Teljes sablon integritás megőrzése
- **Adatbevitel**: Dinamikus kérdés betöltés Excel konfigurációból

### 🎯 Végpontok közötti munkafolyamat
- ✅ Nyelv választás (Magyar/Német)
- ✅ Kérdőív kitöltése több lépésben
- ✅ Hibajelentés súlyossági szintekkel  
- ✅ Digitális aláírás rögzítése
- ✅ Excel protokoll generálás megőrzött formázással
- ✅ Sablon kezelő rendszer
- ✅ Adatok validálása és mentése

### 🛠️ Infrastruktúra
- **Adatbázis séma**: protocols, templates, question_configs táblák
- **Fájl tárolás**: Upload könyvtár és fájl kezelés
- **API végpontok**: Minden REST endpoint működőképes és tesztelt
- **Fejlesztési környezet**: Hot reload és hibakeresés támogatás

### 📱 Felhasználói felület
- **Tablet optimalizált**: Érintőképernyő barát tervezés
- **OTIS branding**: Vállalati arculat és színvilág
- **Reszponzív dizájn**: Mobile-first megközelítés
- **Navigáció**: Intuitív lépésenkénti haladás

---

## Tervezett funkciók v0.2-ben
- PDF generálás Excel sablonokból
- Email küldési rendszer
- Felhő tárolási integráció  
- Kiterjesztett hibajelentés képmellékletekkel
- Jelentés export funkciók
- Felhasználói jogosultság kezelés