# OTIS APROD Excel Template Belső Szintaktika és Változó Dokumentáció

## Áttekintés

Az OTIS APROD alkalmazás Excel template fájlokat használ a protokoll adatok strukturált tárolására és formázására. Ez a dokumentum részletesen bemutatja a template fájlok belső felépítését, változó típusokat és cellahivatkozási rendszert.

## Template Fájl Felépítés

### Fájl Struktúra
- **Protokoll Template**: A fő Excel template ami a végleges protokoll formátumot tartalmazza
- **Kérdés Konfiguráció**: Az egyes kérdések és Excel cellák közötti leképezés
- **Nyelvi Verzió**: Magyar (hu) és német (de) nyelvű template támogatás

### Cella Hivatkozási Rendszer

Az alkalmazás XML-alapú Excel manipulációt használ a formázás megőrzéséhez. Minden kérdés egy vagy több Excel cellához van hozzárendelve.

#### Cella Hivatkozás Formátumok:
- **Egyszerű cella**: `A1`, `B5`, `C10`
- **Több cella**: `A1,B1,C1` (vesszővel elválasztva)
- **Cella tartomány**: `A1:C1` (tartomány esetén)

## Változó Típusok és Implementáció

### 1. TEXT (Szöveges bevitel)

**Leírás**: Egyszerű szöveges mezők
**Excel Cella Típus**: Szöveg
**Példa**:
```
Kérdés: "Épület címe"
Típus: "text"
Cella Hivatkozás: "B3"
Excel Érték: "Budapest, Váci út 1."
```

### 2. NUMBER (Numerikus bevitel)

**Leírás**: Számértékek bevitele
**Excel Cella Típus**: Szám
**Példa**:
```
Kérdés: "Emeletek száma"
Típus: "number"
Cella Hivatkozás: "D5"
Excel Érték: 12
```

### 3. MEASUREMENT (Mérési érték)

**Leírás**: Mérési adatok speciális kezeléssel
**Excel Cella Típus**: Szám (mértékegységgel)
**Példa**:
```
Kérdés: "Feszültség mérés"
Típus: "measurement"
Cella Hivatkozás: "C8"
Excel Érték: 230.5
Egység: "V"
Min Érték: 200
Max Érték: 250
```

### 4. CALCULATED (Számított érték)

**Leírás**: Más mérési értékekből számított eredmények
**Excel Cella Típus**: Szám (képlettel)
**Példa**:
```
Kérdés: "Teljesítmény"
Típus: "calculated"
Cella Hivatkozás: "E10"
Számítási Képlet: "U * I"
Bemeneti Értékek: "Q1_voltage,Q2_current"
Excel Érték: 2070 (számított)
```

### 5. YES_NO_NA (Igen/Nem/Nem alkalmazható)

**Leírás**: Három opciós választás
**Excel Cella Típus**: X jelölés
**Példa**:
```
Kérdés: "Vészhelyzeti megvilágítás működik?"
Típus: "yes_no_na"
Cella Hivatkozás: "F3,G3,H3"
Cellák: F3=Igen, G3=Nem, H3=N/A
Excel Érték: X a megfelelő cellában
```

### 6. TRUE_FALSE (Igaz/Hamis)

**Leírás**: Kétértékű logikai választás
**Excel Cella Típus**: X jelölés
**Példa**:
```
Kérdés: "Biztonsági berendezés ellenőrizve"
Típus: "true_false"
Cella Hivatkozás: "I5,J5"
Cellák: I5=Igaz, J5=Hamis
Excel Érték: X a megfelelő cellában
```

### 7. DATE (Dátum)

**Leírás**: Dátum formátumú bevitel
**Excel Cella Típus**: Dátum
**Példa**:
```
Kérdés: "Átvétel dátuma"
Típus: "date"
Cella Hivatkozás: "B1"
Excel Érték: 2025-02-05
```

### 8. SIGNATURE (Aláírás)

**Leírás**: Digitális aláírás és név
**Excel Cella Típus**: Kép + Szöveg
**Példa**:
```
Kérdés: "Ellenőr aláírása"
Típus: "signature"
Cella Hivatkozás: "A50,B50"
Excel Érték: A50=aláírás kép, B50=név szöveg
```

## Speciális Funkciók

### Measurement és Calculated Kapcsolat

A measurement típusú kérdések értékei inputként szolgálnak a calculated típusú kérdésekhez:

```
Measurement Kérdések:
- Q1_voltage: 230V (measurement)
- Q2_current: 9A (measurement)

Calculated Kérdés:
- Q3_power: U * I (calculated)
- Bemeneti értékek: "Q1_voltage,Q2_current"
- Eredmény: 2070W
```

### Hibahatár Ellenőrzés

Minden measurement és calculated típusnál megadható min/max értékhatár:
```
minValue: 200
maxValue: 250
```

Ha az érték kívül esik a tartományon, automatikus hiba generálódik.

### Multi-row és Multi-cell Támogatás

#### Niedervolt Mérési Táblázat
Speciális táblázatos formátum 6 mérési típushoz, mindegyikhez 3 érték oszlop:

```
Mérés Típus                | Érték 1 | Érték 2 | Érték 3 | Egység
Isolationsmessung         |   500   |   450   |   480   |  MΩ
Kurzschluss-strommessung  |   15    |   16    |   14    |  kA
```

#### Cella Mapping Példa:
```
Q_isolation_1: "D15"  // Első isolationsmessung érték
Q_isolation_2: "E15"  // Második isolationsmessung érték  
Q_isolation_3: "F15"  // Harmadik isolationsmessung érték
```

## XML Manipuláció Részletei

### Formázás Megőrzés
Az alkalmazás JSZip könyvtárat használ az Excel fájl XML tartalmának direkt manipulálására:

1. **Excel fájl kicsomagolás** ZIP archívumként
2. **xl/worksheets/sheet1.xml** fájl módosítása
3. **Cella értékek frissítése** formázás megőrzésével
4. **ZIP újracsomagolás** eredeti Excel formátumban

### Cella Érték Beszúrás
```xml
<!-- Eredeti XML -->
<c r="B3" t="inlineStr">
  <is><t></t></is>
</c>

<!-- Módosított XML -->
<c r="B3" t="inlineStr">
  <is><t>Budapest, Váci út 1.</t></is>
</c>
```

## Template Létrehozási Útmutató

### 1. Excel Template Készítés
- Hozzon létre egy OTIS márkázású Excel fájlt
- Jelölje ki a kitöltendő cellákat
- Alkalmazzon megfelelő formázást és stílust

### 2. Kérdés Konfiguráció
- Hozzon létre kérdés listát JSON/Excel formátumban
- Rendelje hozzá minden kérdéshez a cella hivatkozást
- Adja meg a kérdés típust és paramétereket

### 3. Tesztelés
- Töltse fel a template-et az admin felületen
- Tesztpalkoll végzése különböző értékekkel
- Ellenőrizze a formázás megőrzését

## Példa Template Konfiguráció

```json
{
  "questions": [
    {
      "id": "building_address",
      "title": "Épület címe",
      "type": "text",
      "cellReference": "B3",
      "required": true
    },
    {
      "id": "voltage_measurement",
      "title": "Feszültség mérés",
      "type": "measurement",
      "cellReference": "D8",
      "unit": "V",
      "minValue": 200,
      "maxValue": 250
    },
    {
      "id": "power_calculated",
      "title": "Teljesítmény",
      "type": "calculated",
      "cellReference": "F10",
      "calculationFormula": "voltage_measurement * current_measurement",
      "calculationInputs": "voltage_measurement,current_measurement",
      "unit": "W"
    }
  ]
}
```

## Támogatott Fájl Formátumok

- **Input**: .xlsx, .xls Excel fájlok
- **Output**: .xlsx Excel, .pdf dokumentum
- **Template**: .xlsx formátum ajánlott

## Gyakori Hibák és Megoldások

### Formázás Elvesztése
**Probléma**: Excel formázás nem marad meg
**Megoldás**: XML-alapú manipuláció használata XLSX könyvtár helyett

### Cella Hivatkozás Hiba
**Probléma**: Cella nem található vagy hibás hivatkozás
**Megoldás**: Excel koordináta rendszer (A1, B2) használata

### Calculation Error
**Probléma**: Számított értékek hibásak
**Megoldás**: Input kérdés ID-k ellenőrzése, formula szintaxis javítása

---

**Megjegyzés**: Ez a dokumentáció az OTIS APROD v0.4.8 verzióhoz készült. A template rendszer folyamatos fejlesztés alatt áll a felhasználói visszajelzések alapján.