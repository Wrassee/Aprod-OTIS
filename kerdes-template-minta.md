# Kérdés Template Excel Minta

## Excel fájl struktúra (questions template):

```
A oszlop          | B oszlop        | C oszlop        | D oszlop        | E oszlop
================================================================================
question_id       | title           | title_hu        | title_de        | type
required          | placeholder     | cell_reference  | sheet_name      | group_name
group_name_de     | group_order     | multi_cell      |                 |
================================================================================
1                 | Átvevő neve     | Átvevő neve     | Name des Prüfer | text
TRUE              |                 | F9              | Munka1          | Általános adatok
Allgemeine Daten  | 1               | FALSE           |                 |
--------------------------------------------------------------------------------
2                 | Szerelő neve    | Szerelő neve    | Name des Monteur| text  
TRUE              |                 | Q9              | Munka1          | Általános adatok
Allgemeine Daten  | 2               | FALSE           |                 |
--------------------------------------------------------------------------------
3                 | Irányítószám    | Irányítószám    | Postleitzahl    | number
TRUE              | 0               | G13             | Munka1          | Általános adatok
Allgemeine Daten  | 3               | FALSE           |                 |
--------------------------------------------------------------------------------
10                | X kérdés        | Kérdés X        | X Frage         | yes_no_na
TRUE              |                 | A68,B68,C68     | Munka1          | Gépház
Maschinenraum     | 1               | FALSE           |                 |
--------------------------------------------------------------------------------
11                | Többsoros       | Kérdés sok      | Frage viel      | yes_no_na
TRUE              |                 | A75;A76;A77,B75;B76;B77,C75;C76;C77 | Munka1 | Gépház
Maschinenraum     | 2               | TRUE            |                 |
--------------------------------------------------------------------------------
12                | Igaz/Hamis teszt| Igaz/Hamis teszt| Wahr/Falsch Test| true_false
TRUE              |                 | F20             | Munka1          | Teszt Csoport
Test Gruppe       | 5               | FALSE           |                 |
```

## Cellahivatkozás formátumok:

### 1. **text/number típus** - Egyszerű cella:
```
F9      → egyetlen cella
Q9      → egyetlen cella
G13     → egyetlen cella
```

### 2. **yes_no_na típus** - Három cella (Igen,Nem,N/A):
```
Egyszerű:    "A68,B68,C68"
Többsoros:   "A75;A76;A77,B75;B76;B77,C75;C76;C77"
```

### 3. **true_false típus** - ÚJ! Egy cella (X vagy -):
```
F20     → "X" ha igaz, "-" ha hamis
G25     → "X" ha igaz, "-" ha hamis
```

## Kimenet az Excel protokollban:

| Kérdés típus | Igaz válasz | Hamis válasz | Üres válasz |
|-------------|-------------|--------------|-------------|
| `text`      | Beírt szöveg| Beírt szöveg | ""          |
| `number`    | Szám érték  | Szám érték   | 0           |
| `yes_no_na` | "Yes"       | "No"         | "N/A"       |
| `true_false`| **"X"**     | **"-"**      | ""          |

## Speciális multi_cell beállítás:

- `FALSE`: Normál működés (A68,B68,C68 = 3 különálló cella)
- `TRUE`: Többsoros (A75;A76;A77,B75;B76;B77,C75;C76;C77 = 3x3 mátrix)

Az új `true_false` típus egyszerű bináris döntésekhez használható, ahol az Excel cellába "X" vagy "-" jel kerül!