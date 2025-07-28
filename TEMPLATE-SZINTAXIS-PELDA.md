# OTIS Egyesített Template Szintaxis - Részletes Példa

## 📋 Excel Fájl Struktúra

```
OTIS-TEMPLATE-PELDA.xlsx
├── questions lap    ← Az összes kérdés definíció itt
└── protocol lap     ← OTIS protokoll sablon cellahivatkozásokkal
```

## 📊 Questions Lap - Példa Tartalom

### Oszlop Felépítés (14 oszlop)
```
A: question_id      - Egyedi azonosító (1, 2, m1, m2...)
B: title_hu         - Magyar kérdés szöveg  
C: title_de         - Német kérdés szöveg
D: type             - Kérdés típus
E: cell_reference   - Excel cella hivatkozás
F: unit             - Mértékegység (mm, kg, m/s...)
G: calculation_formula - Számítási képlet
H: calculation_inputs  - Bemeneti változók
I: min_value        - Minimum érték
J: max_value        - Maximum érték  
K: group_name       - Kérdéscsoport
L: group_order      - Sorrend
M: required         - Kötelező (true/false)
N: placeholder      - Segítő szöveg
```

### Példa Sorok

#### 1. Hagyományos szöveges kérdés
```
1 | Átvevő neve | Name des Abnehmers | text | F9 | | | | | | Általános adatok | 1 | true | Teljes név megadása
```

#### 2. Numerikus kérdés validációval
```
3 | Irányítószám | Postleitzahl | number | G13 | | | | 1000 | 9999 | Általános adatok | 3 | true | pl. 1051
```

#### 3. Igen/Nem/NA választás
```
10 | Gépház típus | Maschinenraumtyp | yes_no_na | A68,B68,C68 | | | | | | Gépház | 1 | true | Igen/Nem/NA
```

#### 4. Igaz/Hamis választás
```
12 | Kabin módosítva | Kabine modifiziert | true_false | Q25 | | | | | | Modernizációban érintett | 1 | true | Igaz/Hamis
```

#### 5. Mérési adat ✨ ÚJ
```
m1 | Távolság kabintető és aknatető között | Abstand Kabinendach zu Schachtkopf | measurement | I278 | mm | | | 500 | 3000 | Mérési adatok | 1 | true | Mérés mm-ben
```

#### 6. Számított érték ✨ ÚJ
```
m4 | Effektív biztonsági távolság A | Effektiver Sicherheitsabstand A | calculated | I283 | mm | m1 - m3 | m1,m3 | 700 | 9000 | Mérési adatok | 4 | true | Automatikusan számolt
```

## 🔧 Kérdés Típusok Részletesen

### 1. **text** - Szöveges bevitel
```excel
question_id: 1
title_hu: Átvevő neve
type: text
cell_reference: F9
placeholder: Teljes név megadása
required: true
```
**Eredmény**: Szöveges input mező, érték közvetlenül az F9 cellába kerül

### 2. **number** - Numerikus bevitel
```excel
question_id: 3  
title_hu: Irányítószám
type: number
cell_reference: G13
min_value: 1000
max_value: 9999
placeholder: pl. 1051
```
**Eredmény**: Számok input mezője validációval, G13 cellába mentés

### 3. **yes_no_na** - Háromértékű választás
```excel
question_id: 10
title_hu: Gépház típus
type: yes_no_na
cell_reference: A68,B68,C68
```
**Eredmény**: 
- Igen → "X" az A68 cellába
- Nem → "X" a B68 cellába  
- NA → "X" a C68 cellába

### 4. **true_false** - Kétértékű választás
```excel
question_id: 12
title_hu: Kabin módosítva
type: true_false
cell_reference: Q25
```
**Eredmény**:
- Igaz → "X" a Q25 cellába
- Hamis → "-" a Q25 cellába

### 5. **measurement** ✨ - Mérési adat
```excel
question_id: m1
title_hu: Távolság kabintető és aknatető között
type: measurement
cell_reference: I278
unit: mm
min_value: 500
max_value: 3000
```
**Eredmény**: 
- Numerikus input "mm" felirattal
- Tartomány validáció (500-3000 mm)
- Érték az I278 cellába
- Számított kérdések automatikusan frissülnek

### 6. **calculated** ✨ - Számított érték  
```excel
question_id: m4
title_hu: Effektív biztonsági távolság A
type: calculated
cell_reference: I283
unit: mm
calculation_formula: m1 - m3
calculation_inputs: m1,m3
min_value: 700
max_value: 9000
```
**Eredmény**:
- Nem szerkeszthető mező
- Automatikus számítás: m1 - m3  
- Eredmény az I283 cellába
- Tartományon kívüli értéknél figyelmeztetés

## 🎯 Csoportosítás

### Általános adatok (9 kérdés)
- Átvevő, szerelő, cím adatok
- Projekt és lift azonosítók

### Gépház (2 kérdés) 
- Gépház típus és elhelyezés kérdések

### Modernizációban érintett (5+ kérdés)
- True/false kérdések a modernizációról

### Mérési adatok ✨ ÚJ (5 kérdés)
- m1, m2, m3: Fizikai mérések
- m4, m5: Számított biztonsági távolságok

### Műszaki adatok (4 kérdés)
- Lift típus, terhelhetőség, sebesség, szintek

## 💡 Előnyök az Új Rendszerben

✅ **Egyetlen fájl**: Minden adat egy helyen
✅ **Típusbiztos**: Minden kérdés típus definiált  
✅ **Validáció**: min/max értékek, egységek
✅ **Számítások**: Automatikus képletek
✅ **Többnyelvű**: HU/DE párhuzamos támogatás
✅ **Karbantartható**: Egy helyen minden módosítás

## 🔄 Használati Folyamat

1. **Template készítés**: Excel fájl létrehozása a fenti szintaxis szerint
2. **Admin feltöltés**: Template feltöltése az admin felületen
3. **Automatikus parse**: Rendszer beolvassa a questions lapot  
4. **UI generálás**: Táblázatos felület generálása
5. **Kitöltés**: Felhasználó kitölti a kérdéseket
6. **Excel generálás**: Protocol lap + válaszok = kész protokoll

Ez az új egyesített formátum jelentősen leegyszerűsíti a template kezelést és bővíthetőséget biztosít minden kérdés típus számára.