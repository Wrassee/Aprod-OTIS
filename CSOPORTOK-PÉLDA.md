# EXCEL TEMPLATE CSOPORTOK BEÁLLÍTÁSA

## Excel oszlopok (A-L oszlopok):

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
J = Group/Csoport (magyar blokk neve)
K = Group_DE (német blokk neve)
L = Order/Sorrend (sorrend a csoporton belül)
```

## Példa blokkok Excel-ben:

| ID | Title_HU | Title_DE | Type | Cél | Group | Group_DE | Order |
|----|----------|----------|------|-----|-------|----------|-------|
| 1 | Átvevő neve | Name des Prüfer | text | F9 | **Alapadatok** | **Grunddaten** | 1 |
| 2 | Projekt neve | Projektname | text | Q9 | **Alapadatok** | **Grunddaten** | 2 |
| 3 | Lift azonosító | Lift ID | text | G13 | **Alapadatok** | **Grunddaten** | 3 |
| 7 | Gépház hőmérséklet | Maschinenraum Temperatur | number | O16 | **Gépház** | **Maschinenraum** | 1 |
| 8 | Motor teljesítmény | Motor Leistung | number | O17 | **Gépház** | **Maschinenraum** | 2 |
| 10 | Ajtó zárás OK? | Türverschluss OK? | yes_no_na | A68,B68,C68 | **Ajtók** | **Türen** | 1 |
| 11 | Biztonsági rendszer | Sicherheitssystem | yes_no_na | A75;A76;A77,B75;B76;B77,C75;C76;C77 | **Biztonság** | **Sicherheit** | 1 |

## Új blokkok hozzáadása:

1. **Excel-ben add meg:**
   - **"Group" oszlopban** a magyar blokk nevét (pl. "Motor", "Kábelek", "Vezérlés")
   - **"Group_DE" oszlopban** a német blokk nevét (pl. "Motor", "Kabel", "Steuerung")
   - **"Order" oszlopban** a sorrendet (1, 2, 3...)
2. **Töltsd fel újra a template-et** az Admin felületen
3. **Aktiváld az új template-et**

## Többnyelvű megjelenítés:
- **Magyar nyelv**: "Group" oszlop neve jelenik meg
- **Német nyelv**: "Group_DE" oszlop neve jelenik meg
- Ha nincs német név megadva, a magyar nevet használja

## Blokk megjelenítés:
- Minden blokk külön oldalon jelenik meg
- Blokk nevével és kérdések számával
- Progress bar mutatja a blokkok közötti előrehaladást