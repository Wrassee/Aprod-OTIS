# Hogyan adjunk hozzá mérési kérdéseket az Excel template-hez

## 1. Excel Template felépítése

Az Excel template-nek 2 munkalapot kell tartalmaznia:

### A) "questions" munkálap (kérdések definíciója)
| A oszlop | B oszlop | C oszlop | D oszlop | E oszlop | F oszlop | G oszlop | H oszlop | I oszlop | J oszlop |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| question_id | title_hu | title_de | type | cell_reference | unit | calculation_formula | calculation_inputs | min_value | max_value |

### B) "protocol" munkálap (az actual protokoll template)
- Ez a munkálap tartalmazza a formázott OTIS protokollt
- A cellák (pl. D25, D26) ide kerülnek a válaszok

## 2. Mérési kérdések hozzáadása (measurement type)

### Példa a "questions" munkalapon:

```
| question_id | title_hu | title_de | type | cell_reference | unit | min_value | max_value |
|-------------|----------|----------|------|----------------|------|-----------|-----------|
| m1 | Távolság az aknatető és a kabintető között | Abstand zwischen Schachtkopf und Kabinendach | measurement | D25 | mm | 500 | 3000 |
| m2 | Távolság a legfelső ajtóküszöb és a kabinküszöb között | Abstand zwischen oberster Türschwelle und Kabinenschwelle | measurement | D26 | mm | 0 | 50 |
| m3 | Távolság az ellensúly puffer és a süllyeszték között | Abstand zwischen Gegengewichtpuffer und Grube | measurement | D27 | mm | 100 | 1000 |
```

### Magyarázat:
- **question_id**: Egyedi azonosító (pl. m1, m2, m3)
- **title_hu**: Magyar cím
- **title_de**: Német cím  
- **type**: "measurement" 
- **cell_reference**: Melyik Excel cellába kerüljön (pl. D25)
- **unit**: Mértékegység (pl. mm, cm, m)
- **min_value**: Minimális elfogadható érték
- **max_value**: Maximális elfogadható érték

## 3. Számított kérdések hozzáadása (calculated type)

### Példa:

```
| question_id | title_hu | title_de | type | cell_reference | unit | calculation_formula | calculation_inputs | min_value | max_value |
|-------------|----------|----------|------|----------------|------|---------------------|-------------------|-----------|-----------|
| c1 | Szabadmagasság összesen | Gesamte Kopfhöhe | calculated | D28 | mm | m1 + m2 | m1,m2 | 2500 | 5000 |
| c2 | Biztonsági távolság | Sicherheitsabstand | calculated | D29 | mm | m3 - 100 | m3 | 150 | 800 |
```

### Magyarázat:
- **type**: "calculated"
- **calculation_formula**: Matematikai képlet (pl. "m1 + m2", "m3 - 100")
- **calculation_inputs**: Vesszővel elválasztott input kérdés ID-k (pl. "m1,m2")

## 4. Protocol munkálap formázása

A "protocol" munkalapon a megfelelő celláknak (D25, D26, D27, D28, D29) formázottnak kell lenniük:

```
| C oszlop | D oszlop |
|----------|----------|
| Aknatető-kabintető távolság: | [D25] mm |
| Ajtóküszöb-kabinküszöb távolság: | [D26] mm |
| Ellensúly puffer távolság: | [D27] mm |
| Szabadmagasság összesen: | [D28] mm |
| Biztonsági távolság: | [D29] mm |
```

## 5. Template feltöltése a rendszerbe

1. **Admin felület** → **Template Management**
2. **"Upload Questions Template"** gomb
3. Excel fájl kiválasztása
4. **Language**: "Multilingual (HU/DE)" kiválasztása
5. **Upload** gomb
6. **Activate** gomb a feltöltött template mellett

## 6. Működési logika

### Mérési kérdések:
- A felhasználó számot ad meg
- A program ellenőrzi a min/max értékeket
- Ha kívül esik → automatikusan hozzáadja a hibalistához
- Excel-ben: "1250 mm" formátumban jelenik meg

### Számított kérdések:
- Automatikusan számítódnak a mérési értékekből
- Ha a számított érték kívül esik a határértékeken → hibalistára kerül
- Excel-ben: "1350 mm" formátumban jelenik meg

## 7. Hibakeresés

Ha a kérdések nem jelennek meg:

1. **Ellenőrizd a munkálap neveket**: "questions" és "protocol"
2. **Ellenőrizd az oszlop fejléceket**: question_id, title_hu, title_de, type, stb.
3. **Ellenőrizd a type értékeket**: "measurement" vagy "calculated" (kisbetűvel!)
4. **Console log**: F12 → Console → nézd meg a hibákat

## 8. Teljes példa Excel template

Létrehoztam egy demo template-et a `measurement-demo-template.xlsx` fájlban, amit referenciaként használhatsz.

## 9. Tesztelés

1. Template feltöltése után frissítsd az oldalt
2. Indítsd el a protokoll kitöltést
3. A mérési kérdések új input mezőkként jelennek meg
4. A számított kérdések automatikusan frissülnek
5. Az Excel letöltésnél minden érték megjelenik a megfelelő cellákban