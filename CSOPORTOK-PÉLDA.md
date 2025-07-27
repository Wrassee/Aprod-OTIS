# EXCEL TEMPLATE CSOPORTOK BEÁLLÍTÁSA

## Excel oszlopok (A-K oszlopok):

```
A = ID (1, 2, 3, 4...)
B = Title_EN (angol cím)
C = Title_HU (magyar cím) 
D = Title_DE (német cím)
E = Type (text, number, yes_no_na)
F = Required (igen/nem)
G = Placeholder
H = Cél (cellahivatkozás pl. F9, G13)
I = MultiCell (igen/nem - többsoros X elhelyezés)
J = Group/Csoport (blokk neve)
K = Order/Sorrend (sorrend a csoporton belül)
```

## Példa blokkok Excel-ben:

| ID | Title_HU | Type | Cél | Group | Order |
|----|----------|------|-----|-------|-------|
| 1 | Átvevő neve | text | F9 | **Alapadatok** | 1 |
| 2 | Projekt neve | text | Q9 | **Alapadatok** | 2 |
| 3 | Lift azonosító | text | G13 | **Alapadatok** | 3 |
| 7 | Gépház hőmérséklet | number | O16 | **Gépház** | 1 |
| 8 | Motor teljesítmény | number | O17 | **Gépház** | 2 |
| 10 | Ajtó zárás OK? | yes_no_na | A68,B68,C68 | **Ajtók** | 1 |
| 11 | Biztonsági rendszer | yes_no_na | A75;A76;A77,B75;B76;B77,C75;C76;C77 | **Biztonság** | 1 |

## Új blokkok hozzáadása:

1. **Excel-ben add meg a "Group" oszlopban** a blokk nevét (pl. "Motor", "Kábelek", "Vezérlés")
2. **"Order" oszlopban** add meg a sorrendet (1, 2, 3...)
3. **Töltsd fel újra a template-et** az Admin felületen
4. **Aktiváld az új template-et**

## Blokk megjelenítés:
- Minden blokk külön oldalon jelenik meg
- Blokk nevével és kérdések számával
- Progress bar mutatja a blokkok közötti előrehaladást