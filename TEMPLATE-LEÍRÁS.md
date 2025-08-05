# OTIS APROD Excel Template Készítési Útmutató

## Template Formátumok

### 1. Strukturált Kérdés Template (Ajánlott)

Hozz létre egy Excel fájlt "Questions" munkalappal a következő oszlopokkal:

| Kérdés ID | Magyar Kérdés | Német Kérdés | Típus | Cella Hivatkozás |
|-----------|---------------|---------------|-------|------------------|
| Q1 | Átvétel dátuma | Abnahmedatum | date | B2 |
| Q2 | Technikus neve | Techniker Name | text | D2 |
| Q3 | Épület címe | Gebäude Adresse | text | B3 |
| Q4 | Lift azonosító | Lift ID | text | D3 |
| Q5 | Biztonságtechnikai ellenőrzés | Sicherheitsprüfung | yes_no_na | B6,C6,D6 |
| Q6 | Vészhelyzeti megvilágítás | Notbeleuchtung | yes_no_na | B7,C7,D7 |
| Q7 | Ajtó zárási mechanizmus | Türverriegelung | true_false | B8,C8 |
| Q8 | Feszültség mérése [V] | Spannungsmessung [V] | measurement | B10 |
| Q9 | Áram mérése [A] | Strommessung [A] | measurement | B11 |
| Q10 | Teljesítmény [W] | Leistung [W] | calculated | B12 |

### 2. Támogatott Kérdés Típusok

#### TEXT
- Egyszerű szöveges bevitel
- Cella hivatkozás: egyetlen cella (pl. B3)

#### NUMBER  
- Numerikus értékek
- Cella hivatkozás: egyetlen cella (pl. D5)

#### DATE
- Dátum formátum
- Cella hivatkozás: egyetlen cella (pl. B1)

#### YES_NO_NA
- Háromértékű választás: Igen/Nem/N.A.
- Cella hivatkozás: három cella vesszővel elválasztva (pl. B6,C6,D6)

#### TRUE_FALSE
- Kétértékű választás: Igaz/Hamis
- Cella hivatkozás: két cella vesszővel elválasztva (pl. B8,C8)

#### MEASUREMENT
- Mérési értékek mértékegységgel
- Cella hivatkozás: egyetlen cella (pl. B10)

#### CALCULATED
- Számított értékek más kérdésekből
- Cella hivatkozás: egyetlen cella (pl. B12)

#### SIGNATURE
- Digitális aláírás és név
- Cella hivatkozás: két cella (pl. A50,B50)

### 3. Template Feltöltési Lépések

1. **Admin felület megnyitása** → Templates tab
2. **Upload Template** gomb megnyomása
3. **Template adatok megadása**:
   - Név: pl. "OTIS Átvételi Protokoll v1.0"
   - Típus: "unified" (tartalmaz minden kérdéstípust)
   - Nyelv: "multilingual" (magyar és német)
4. **Excel fájl kiválasztása**
5. **Upload** gomb megnyomása
6. **Template aktiválása** a listában

### 4. Hibaelhárítás

#### Ha a kérdések nem töltődnek be:
- Ellenőrizd, hogy a Questions munkalap létezik
- Ellenőrizd az oszlop fejléceket (ID, kérdés, típus, cella)
- Ellenőrizd a cella hivatkozások formátumát

#### Ha a template nem aktiválódik:
- Próbáld meg újra feltölteni
- Ellenőrizd a konzol hibaüzeneteket
- Használj egyszerűbb cella hivatkozásokat

### 5. Példa Fájlok

A projektben található példa template-ek:
- `OTIS-PELDA-TEMPLATE.xlsx` - Teljes példa template
- `PELDA-TEMPLATE-MINTA.xlsx` - Egyszerű példa

### 6. Technikai Részletek

Az alkalmazás XML-alapú Excel manipulációt használ:
- Megőrzi az eredeti formázást
- Támogatja a unicode karaktereket
- Működik összetett cellahivatkozásokkal
- LibreOffice-szal konvertál PDF-be