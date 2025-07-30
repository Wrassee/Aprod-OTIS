# Gyors Excel teszt létrehozása mérési kérdésekkel

Hozz létre egy Excel fájlt ezzel a szerkezettel:

## 1. Munkálap neve: "questions" (fontos!)

## 2. Első sor (fejlécek):
| A1 | B1 | C1 | D1 | E1 | F1 | G1 | H1 | I1 | J1 |
|----|----|----|----|----|----|----|----|----|----|
| question_id | title_hu | title_de | type | cell_reference | unit | calculation_formula | calculation_inputs | min_value | max_value |

## 3. Második sor (mérési kérdés példa):
| A2 | B2 | C2 | D2 | E2 | F2 | G2 | H2 | I2 | J2 |
|----|----|----|----|----|----|----|----|----|----|
| m1 | Távolság aknatető-kabintető | Abstand Schachtkopf-Kabinendach | measurement | D25 | mm | | | 500 | 3000 |

## 4. Harmadik sor (számított kérdés példa):
| A3 | B3 | C3 | D3 | E3 | F3 | G3 | H3 | I3 | J3 |
|----|----|----|----|----|----|----|----|----|----|
| c1 | Szabadmagasság összesen | Gesamte Kopfhöhe | calculated | D28 | mm | m1 + 500 | m1 | 2500 | 5000 |

Mentsd el .xlsx formátumban és töltsd fel a rendszerbe!

## Fontos észrevételek:
- A "questions" munkálap név KÖTELEZŐ
- A type oszlopban pontosan "measurement" vagy "calculated" kell lennie
- A calculation_formula és calculation_inputs csak calculated típusnál kell