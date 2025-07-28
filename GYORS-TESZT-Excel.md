# EXCEL TEMPLATE OSZLOP PÉLDA - EGYSZERŰ VERZIÓ

## 📊 Az Excel "questions" lap így néz ki:

```
| A | B              | C               | D          | E            | F  | G       | H     | I    | J    | K            | L | M    | N           |
|---|----------------|-----------------|------------|--------------|----|---------|---------|----|------|-------------|---|------|-------------|
| 1 | Átvevő neve    | Name Abnehmer   | text       | F9           |    |         |      |    |    | Általános   | 1 | true | Teljes név  |
| 2 | Szerelő neve   | Name Monteur    | text       | Q9           |    |         |      |    |    | Általános   | 2 | true | Szerelő     |
| 3 | Irányítószám   | Postleitzahl    | number     | G13          |    |         |      |1000|9999| Általános   | 3 | true | pl. 1051    |
|10 | Gépház típus   | Maschinenraum   | yes_no_na  | A68,B68,C68  |    |         |      |    |    | Gépház      | 1 | true | Igen/Nem/NA |
|12 | Kabin módosítva| Kabine modif.   | true_false | Q25          |    |         |      |    |    | Modernizáció| 1 | true | Igaz/Hamis  |
|m1 | Kabintető      | Abstand Dach    | measurement| I278         | mm |         |      | 500|3000| Mérési      | 1 | true | Mérés mm    |
|m4 | Effektív A     | Effektiver A    | calculated | I283         | mm | m1 - m3 | m1,m3| 700|9000| Mérési      | 4 | true | Auto számolt|
```

## 🔤 Oszlopok Röviden:

**A** - question_id (azonosító: 1, 2, m1...)
**B** - title_hu (magyar szöveg)  
**C** - title_de (német szöveg)
**D** - type (text, number, measurement, calculated...)
**E** - cell_reference (F9, I278... hova kerül az Excel-ben)
**F** - unit (mm, kg, m/s... mértékegység)
**G** - calculation_formula (m1-m3... képlet)
**H** - calculation_inputs (m1,m3... mit használ)
**I** - min_value (minimum érték)
**J** - max_value (maximum érték)  
**K** - group_name (kérdéscsoport)
**L** - group_order (sorrend)
**M** - required (kötelező-e)
**N** - placeholder (segítő szöveg)

## 💡 Fő Kérdés Típusok:

### 1. **text** - Szöveg
```
1 | Átvevő neve | Name | text | F9 | | | | | | Általános | 1 | true | Név
```

### 2. **number** - Szám
```  
3 | Irányítószám | PLZ | number | G13 | | | | 1000 | 9999 | Általános | 3 | true | 1051
```

### 3. **measurement** - Mérés
```
m1 | Távolság | Distance | measurement | I278 | mm | | | 500 | 3000 | Mérési | 1 | true | mm-ben
```

### 4. **calculated** - Számított
```
m4 | Effektív | Effective | calculated | I283 | mm | m1-m3 | m1,m3 | 700 | 9000 | Mérési | 4 | true | Auto
```

Ez az új egyesített struktúra egyetlen Excel lapon tartalmazza az összes kérdés definíciót!