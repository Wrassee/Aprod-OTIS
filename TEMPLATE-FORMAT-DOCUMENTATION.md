# OTIS APROD - Template Formátum Dokumentáció

## Áttekintés
Az OTIS APROD alkalmazás Excel template-eket használ a kérdések és eszközök dinamikus betöltésére. Ez a dokumentum leírja a támogatott template formátumokat.

## Template Típusok

### 1. Unified Template (Egységes Sablon)
**Fájlnév konvenció:** `*unified*` vagy `*egyesitett*`
**Munkalapok:**
- **Questions**: Kérdések definíciója
- **NIV**: Niedervolt eszközök listája

### 2. Questions Template (Kérdés Sablon)
**Fájlnév konvenció:** `*questions*` vagy `*kerdes*`
**Munkalapok:**
- **Questions**: Kérdések definíciója

### 3. Protocol Template (Protokoll Sablon)
**Fájlnév konvenció:** `*protocol*` vagy `*protokoll*`
**Használat:** PDF generáláshoz

## Questions Munkalap Formátum

### Oszlopok (A-H):
```
A: id          - Egyedi azonosító (pl: "1", "2", "3")
B: title_de    - Német cím
C: title_hu    - Magyar cím  
D: type        - Kérdés típusa
E: options_de  - Német opciók (JSON array vagy | elválasztott)
F: options_hu  - Magyar opciók (JSON array vagy | elválasztott)
G: required    - Kötelező mező (true/false)
H: group       - Csoport név (opcionális)
```

### Támogatott Kérdés Típusok:
- **text**: Szöveges beviteli mező
- **textarea**: Többsoros szöveg
- **select**: Dropdown lista
- **radio**: Rádiógomb választó
- **checkbox**: Jelölőnégyzet
- **date**: Dátum választó
- **number**: Szám bevitel
- **email**: Email cím
- **phone**: Telefonszám
- **measurement**: Mérési érték számítással
- **calculated**: Automatikusan számított érték

### Példa Questions Munkalap:
```
A        B                    C                    D      E                           F                           G       H
id       title_de             title_hu             type   options_de                  options_hu                  required group
1        Aufzugsnummer        Lift száma           text                                                          true     basic
2        Hersteller           Gyártó               select Otis|Schindler|Kone|ThyssenKrupp  Otis|Schindler|Kone|ThyssenKrupp  true     basic
3        Tragfähigkeit        Teherbírás           number                                                         true     specs
4        Geschwindigkeit      Sebesség             number                                                         false    specs
5        Übernahmeprotokoll   Átvételi jegyzőkönyv radio  Ja|Nein                     Igen|Nem                  true     protocol
```

## NIV (Niedervolt) Munkalap Formátum

### Oszlopok (A-C):
```
A: id       - Eszköz azonosító (pl: "device-1", "device-2")
B: name_de  - Német eszköz név
C: name_hu  - Magyar eszköz név
```

### Példa NIV Munkalap:
```
A           B                    C
id          name_de              name_hu
device-1    Antriebsmotor        Motor vagy vezérlés
device-2    Türantriebsmotor     Ajtó motor
device-3    Lüfter               Ventilátor
device-4    Beleuchtung Kabine   Kabin világítás
device-5    Beleuchtung Schacht  Akna világítás
device-6    Notruf               Vészhívó
device-7    Steuerung            Vezérlés
device-8    Schützsteuerung      Kontaktor vezérlés
device-9    Frequenzumrichter    Frekvenciaváltó
device-10   Bremse               Fék
device-11   Encoder              Enkóder
device-12   Sicherheitskette     Biztonsági lánc
device-13   Netzanschluss        Hálózati csatlakozás
```

## Opciók Formátum

### JSON Array (Ajánlott):
```json
["Option 1", "Option 2", "Option 3"]
```

### Pipe Elválasztott (Alternatíva):
```
Option 1|Option 2|Option 3
```

### Üres Opcióknál:
- Üres cella a `select` és `radio` típusoknál automatikus dropdown generálást jelent
- Text típusoknál az opciók nem szükségesek

## Nyelvi Támogatás

### Kétnyelvű Rendszer:
- **DE (Deutsch)**: Német nyelv
- **HU (Hungarian)**: Magyar nyelv

### Kötelező Mezők:
- Minden `title_de` és `title_hu` mezőt ki kell tölteni
- Az `id` mezőnek egyedinek kell lennie
- A `type` mező kötelező és támogatott értéket kell tartalmaznia

## Template Aktiválás

### Admin Felületen:
1. Template feltöltése (.xlsx fájl)
2. Típus kiválasztása (unified/questions/protocol)
3. Nyelv beállítása (multilingual/de/hu)
4. Aktiválás gombra kattintás

### Automatikus Felismerés:
A rendszer automatikusan felismeri a template típusát a fájlnév alapján:
- `*unified*`, `*egyesitett*` → Unified
- `*questions*`, `*kerdes*` → Questions  
- `*protocol*`, `*protokoll*` → Protocol

## Hibaelhárítás

### Gyakori Hibák:
1. **Hiányzó munkalap**: Ellenőrizze a munkalap neveket
2. **Hibás oszlop struktúra**: Kövesse a megadott formátumot
3. **Üres kötelező mezők**: Töltse ki az összes kötelező cellát
4. **Érvénytelen típus**: Használjon támogatott kérdés típusokat

### Logs Ellenőrzése:
A szerver konzolban megjelenő hibaüzenetek segítenek a problémák azonosításában:
```
📊 Template loaded successfully: 25 questions found
⚠️ Failed to load template: worksheet 'Questions' not found
```

## Fejlesztési Jegyzetek

### Új Kérdés Típus Hozzáadása:
1. Frissítse a `QuestionType` enum-ot
2. Implementálja a frontend komponenst
3. Adja hozzá a validation logikát
4. Dokumentálja a használatot

### Új Munkalap Támogatás:
1. Frissítse a template parser-t
2. Adja hozzá az új munkalap kezelését
3. Tesztelje a backward compatibility-t