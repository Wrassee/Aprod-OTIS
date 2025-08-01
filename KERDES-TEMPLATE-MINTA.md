# OTIS APROD - Kérdés Template Excel Módosítási Útmutató

## Niedervolt Installations Verordnung art.14 Mérési Jegyzőkönyv Konfigurálása

### Áttekintés

Ez az útmutató bemutatja, hogyan kell módosítani a **questions template Excel** fájlt, hogy a Niedervolt mérési oldal megfelelő kérdéseket és fejléc szövegeket kapjon.

---

## 1. Excel Template Szerkezete

A questions template Excel fájl tartalmazza az összes kérdést és azok konfigurációját. A Niedervolt mérési funkciókhoz új sorokat kell hozzáadni.

### Jelenlegi Oszlop Struktúra:
- **A oszlop**: Kérdés ID (pl. "niedervolt_1", "niedervolt_2")  
- **B oszlop**: Kérdés címe (pl. "Isolationsmessung")
- **C oszlop**: Kérdés típusa (mindig "measurement")
- **D oszlop**: Kötelező-e (TRUE/FALSE)
- **E oszlop**: Placeholder szöveg
- **F oszlop**: Cell referencia (Excel koordináta)
- **G oszlop**: Sheet név (pl. "Sheet1")
- **H oszlop**: Csoport név (pl. "niedervolt_measurements")

---

## 2. Példa Konfigurációk

### Mérési Típusok Hozzáadása

Írd be ezeket a sorokat a questions template Excel fájlba:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| `niedervolt_isolation` | `Isolationsmessung` | `measurement` | `FALSE` | `Ohm értékek` | `A667` | `Sheet1` | `niedervolt_measurements` |
| `niedervolt_shortcircuit` | `Kurzschluss-strommessung` | `measurement` | `FALSE` | `Ampere értékek` | `A668` | `Sheet1` | `niedervolt_measurements` |
| `niedervolt_voltage` | `Spannungsmessung` | `measurement` | `FALSE` | `Volt értékek` | `A669` | `Sheet1` | `niedervolt_measurements` |
| `niedervolt_continuity` | `Durchgangsprüfung` | `measurement` | `FALSE` | `Ohm értékek` | `A670` | `Sheet1` | `niedervolt_measurements` |
| `niedervolt_insulation_resistance` | `Isolationswiderstand` | `measurement` | `FALSE` | `MOhm értékek` | `A671` | `Sheet1` | `niedervolt_measurements` |
| `niedervolt_earth_resistance` | `Erdungswiderstand` | `measurement` | `FALSE` | `Ohm értékek` | `A672` | `Sheet1` | `niedervolt_measurements` |

---

## 3. Kétnyelvű Támogatás

### Magyar-Német verzió esetén:

Ha unified (kétnyelvű) template-et használsz, add hozzá ezeket az oszlopokat:

| I oszlop (titleHu) | J oszlop (titleDe) |
|---|---|
| `Szigetelési mérés` | `Isolationsmessung` |
| `Rövidzárlat áram mérés` | `Kurzschluss-strommessung` |
| `Feszültség mérés` | `Spannungsmessung` |
| `Folytonosság vizsgálat` | `Durchgangsprüfung` |
| `Szigetelési ellenállás` | `Isolationswiderstand` |
| `Földelési ellenállás` | `Erdungswiderstand` |

---

## 4. Excel Cell Mapping Példa

### Protocol Template Módosítás

A protocol template Excel fájlban készítsd elő a 667+ sorokat:

```
Sor 667: [Mérési típus] [Leírás] [Érték1] [Érték2] [Érték3] [Egység] [Megjegyzés]
Sor 668: [Mérési típus] [Leírás] [Érték1] [Érték2] [Érték3] [Egység] [Megjegyzés]
...stb
```

### Példa Excel Template Cellák:
- **A667**: Mérési típus neve
- **B667**: Részletes leírás  
- **C667**: Első mért érték
- **D667**: Második mért érték
- **E667**: Harmadik mért érték
- **F667**: Mértékegység
- **G667**: Megjegyzések

---

## 5. Konfigurációs Fájl Frissítése

### A `excelParserService` automatikusan felismeri:

1. **Csoport alapú csoportosítás**: `groupName: "niedervolt_measurements"`
2. **Measurement típusú kérdések**: `type: "measurement"`  
3. **Cell referenciák**: `cellReference: "A667"`
4. **Kétnyelvű címek**: `titleHu` és `titleDe` oszlopok

---

## 6. Tesztelési Lépések

### Template Feltöltése:
1. Módosítsd a questions template Excel fájlt a fenti példák szerint
2. Töltsd fel az Admin oldalon: **"questions"** típusként
3. Aktiváld a template-et
4. Indíts új protokollt és navigálj a Niedervolt oldalra

### Ellenőrzés:
✅ A 6 mérési típus megjelenik a dropdown-ban  
✅ A magyar/német címek helyesen töltődnek be  
✅ A táblázat oszlopok megfelelően működnek  
✅ A localStorage mentés és betöltés működik  

---

## 7. Hibaelhárítás

### Gyakori problémák:

**Nem jelenik meg a mérési típus:**
- Ellenőrizd, hogy a `type` oszlopban "measurement" érték van
- Győződj meg róla, hogy a `groupName` "niedervolt_measurements"

**Rossz nyelvi címek:**
- Kétnyelvű template esetén használd a `titleHu` és `titleDe` oszlopokat
- Egyes nyelvű template esetén a `B` oszlop tartalmazza a címet

**Excel integráció nem működik:**
- Jelenleg le van tiltva, amíg az UI nem készül el teljesen
- A cell referenciák előkészítése fontos a jövőbeli integrációhoz

---

## 8. Példa Template Struktúra (Teljes Sor)

```excel
niedervolt_isolation | Isolationsmessung | measurement | FALSE | Ohm értékek | A667 | Sheet1 | niedervolt_measurements | Szigetelési mérés | Isolationsmessung
```

Ez a sor létrehoz egy "Isolationsmessung" mérési típust, amely az A667 cellába fog bekerülni az Excel protocol template-ben.

---

**Megjegyzés**: Az Excel integráció jelenleg le van tiltva a stabil UI fejlesztés érdekében. A template konfigurálása után fokozatosan fogjuk újra aktiválni a funkcionalitást.