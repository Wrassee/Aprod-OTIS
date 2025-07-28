# ÚJ EGYESÍTETT OTIS TEMPLATE SZINTAXIS

## 📋 Template Struktúra

### Excel Fájl Felépítés
```
EGYESITETT-OTIS-TEMPLATE.xlsx
├── questions lap      - Minden kérdés definíció
└── protocol lap       - OTIS protokoll sablon
```

### Questions Lap Oszlopai (14 oszlop)
1. **question_id** - Egyedi azonosító (1, 2, 3, m1, m2, stb.)
2. **title_hu** - Magyar kérdés szöveg
3. **title_de** - Német kérdés szöveg  
4. **type** - Kérdés típus (text, number, measurement, calculated, yes_no_na, true_false)
5. **cell_reference** - Excel cella hivatkozás (F9, Q9, I278, stb.)
6. **unit** - Mértékegység (mm, cm, kg, stb.)
7. **calculation_formula** - Számítási képlet (m1 - m3)
8. **calculation_inputs** - Bemeneti változók (m1,m3)
9. **min_value** - Minimum érték
10. **max_value** - Maximum érték
11. **group_name** - Kérdéscsoport neve
12. **group_order** - Sorrend a csoporton belül
13. **required** - Kötelező-e (true/false)
14. **placeholder** - Helymegtartó szöveg

## 🏷️ Kérdés Típusok (26 összesen)

### Hagyományos Típusok
- **text** (7 kérdés) - Szöveges bevitel
- **number** (2 kérdés) - Numerikus bevitel
- **yes_no_na** (2 kérdés) - Igen/Nem/Nem alkalmazható
- **true_false** (10 kérdés) - Igaz/Hamis választás

### Mérési Típusok ✨ ÚJ
- **measurement** (3 kérdés) - Mérési adatok bevitele
- **calculated** (2 kérdés) - Automatikus számítások

## 📊 Kérdéscsoportok

1. **Általános adatok** (9 kérdés)
   - Átvevő neve, Szerelő neve, Cím adatok, stb.

2. **Gépház** (2 kérdés)  
   - Gépház típus kérdések

3. **Modernizációban érintett** (10 kérdés)
   - True/false kérdések modernizációról

4. **Mérési adatok** (5 kérdés) ✨ ÚJ BLOKK
   - m1, m2, m3: Mérési bevitelek
   - m4, m5: Automatikus számítások

## 💡 Új Előnyök

✅ **Egyszerűsített kezelés** - Egyetlen Excel fájl minden adattal
✅ **Konzisztens struktúra** - Minden kérdés típus egységes formátumban  
✅ **Integrált mérések** - Mérési adatok a hagyományos kérdésekkel együtt
✅ **Admin-barát** - Könnyebb template kezelés
✅ **Karbantartható** - Egy helyen minden konfiguráció

## 🔧 Használat

1. **Template feltöltés**: Egyetlen Excel feltöltése az admin felületen
2. **Automatikus betöltés**: Rendszer beolvassa mind a 26 kérdést
3. **Csoportosított megjelenítés**: Kérdések csoportonként jelennek meg
4. **Táblázatos UI**: Bal oldal kérdések, jobb oldal válaszok
5. **Számítások**: m4 és m5 automatikusan frissül

## 📝 Példa Kérdések

```
ID  | Cím                                           | Típus       | Csoport
----+-----------------------------------------------+-------------+------------------
1   | Átvevő neve                                   | text        | Általános adatok
2   | Szerelő neve                                  | text        | Általános adatok  
m1  | Távolság kabintető és Aknatető között         | measurement | Mérési adatok
m4  | Effektív távolság A                           | calculated  | Mérési adatok
12  | Kérdések                                      | true_false  | Modernizációban érintett
10  | X                                             | yes_no_na   | Gépház
```

## 🎯 Eredmény

**Korábban**: 2 külön template (protocol + measurement)
**Most**: 1 egyesített template minden funkcióval

Template egyszerűsítés: 2 → 1 fájl (-50%)
Admin munka csökkentés: Jelentős
Felhasználói élmény: Javult (táblázatos UI)
Karbantarthatóság: Sokkal jobb