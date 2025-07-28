# EXCEL KÉRDÉS TEMPLATE OSZLOPAI - VIZUÁLIS PÉLDA

## 📊 Template Tábla Szerkezet

Az Excel "questions" lap így néz ki:

```
A           B                    C                    D         E         F    G                H            I      J      K              L      M        N
question_id title_hu             title_de             type      cell_ref  unit calc_formula    calc_inputs  min    max    group_name     order  required placeholder
-----------+--------------------+--------------------+---------+---------+----+---------------+------------+------+------+--------------+------+--------+------------------
1          | Átvevő neve        | Name des Abnehmers | text    | F9      |    |               |            |      |      | Általános     | 1    | true   | Teljes név
2          | Szerelő neve       | Name des Monteurs  | text    | Q9      |    |               |            |      |      | Általános     | 2    | true   | Szerelő neve  
3          | Irányítószám       | Postleitzahl       | number  | G13     |    |               |            | 1000 | 9999 | Általános     | 3    | true   | pl. 1051
4          | Város              | Stadt              | text    | O13     |    |               |            |      |      | Általános     | 4    | true   | Város neve
10         | Gépház típus       | Maschinenraumtyp   | yes_no_na| A68,B68,C68|  |               |            |      |      | Gépház        | 1    | true   | Igen/Nem/NA
12         | Kabin módosítva    | Kabine modifiziert | true_false| Q25    |    |               |            |      |      | Modernizáció  | 1    | true   | Igaz/Hamis
m1         | Kabintető távolság | Abstand Kabinendach| measurement| I278   | mm |               |            | 500  | 3000 | Mérési adatok | 1    | true   | Mérés mm-ben
m4         | Effektív távolság A| Effektiver Abstand A| calculated| I283   | mm | m1 - m3       | m1,m3      | 700  | 9000 | Mérési adatok | 4    | true   | Auto számolt
```

## 📋 Oszlopok Jelentése

### A - question_id
- **Cél**: Egyedi azonosító
- **Példák**: `1`, `2`, `m1`, `m4`
- **Szabály**: Számok vagy betű+szám kombináció

### B - title_hu  
- **Cél**: Magyar kérdés szöveg
- **Példa**: `"Átvevő neve"`
- **Megjelenés**: Ez látszik a felhasználónak

### C - title_de
- **Cél**: Német kérdés szöveg  
- **Példa**: `"Name des Abnehmers"`
- **Használat**: Német nyelv választásakor

### D - type
- **Értékek**: 
  - `text` - szöveges bevitel
  - `number` - szám bevitel
  - `yes_no_na` - Igen/Nem/NA
  - `true_false` - Igaz/Hamis
  - `measurement` - mérés egységgel
  - `calculated` - automatikus számítás

### E - cell_reference
- **Cél**: Melyik Excel cellába kerüljön a válasz
- **Példák**: 
  - `F9` - egyszerű cella
  - `A68,B68,C68` - yes_no_na típusnál 3 cella
  - `I278` - mérési adat cellája

### F - unit
- **Cél**: Mértékegység
- **Példák**: `mm`, `kg`, `m/s`, `db`
- **Használat**: Measurement típusnál kötelező

### G - calculation_formula
- **Cél**: Számítási képlet
- **Példák**: `m1 - m3`, `m2 + m1`
- **Használat**: Csak calculated típusnál

### H - calculation_inputs
- **Cél**: Mely változókat használja a képlet
- **Példa**: `m1,m3` (vesszővel elválasztva)
- **Használat**: Calculated típusnál kötelező

### I - min_value
- **Cél**: Minimum érték
- **Példa**: `500`, `1000`
- **Használat**: Number és measurement típusnál

### J - max_value
- **Cél**: Maximum érték
- **Példa**: `3000`, `9999`
- **Használat**: Number és measurement típusnál

### K - group_name
- **Cél**: Kérdéscsoport neve
- **Példák**: 
  - `"Általános adatok"`
  - `"Mérési adatok"`
  - `"Gépház"`

### L - group_order
- **Cél**: Sorrend a csoporton belül
- **Értékek**: `1`, `2`, `3`...
- **Használat**: Kérdések sorrendje

### M - required
- **Értékek**: `true` vagy `false`
- **Cél**: Kötelező-e kitölteni
- **Alapértelmezett**: `true`

### N - placeholder
- **Cél**: Segítő szöveg
- **Példák**: 
  - `"Teljes név megadása"`
  - `"pl. 1051"`
  - `"Mérés mm-ben"`

## 💡 Gyakorlati Példák

### 1. Egyszerű szöveg kérdés:
```excel
1 | Átvevő neve | Name des Abnehmers | text | F9 | | | | | | Általános adatok | 1 | true | Teljes név
```

### 2. Szám validációval:
```excel
3 | Irányítószám | Postleitzahl | number | G13 | | | | 1000 | 9999 | Általános adatok | 3 | true | pl. 1051
```

### 3. Mérési adat:
```excel
m1 | Kabintető távolság | Abstand Kabinendach | measurement | I278 | mm | | | 500 | 3000 | Mérési adatok | 1 | true | Mérés mm-ben
```

### 4. Számított érték:
```excel
m4 | Effektív távolság | Effektiver Abstand | calculated | I283 | mm | m1 - m3 | m1,m3 | 700 | 9000 | Mérési adatok | 4 | true | Automatikusan számolt
```

Ez a 14 oszlopos struktúra teszi lehetővé, hogy minden kérdés típus egy helyen legyen definiálva az egyesített template-ben!