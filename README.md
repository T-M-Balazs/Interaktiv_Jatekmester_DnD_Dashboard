# Interaktiv_Jatekmester_DnD_Dashboard projekt futtatása

Ez a leírás bemutatja, hogyan lehet a projektet egy másik gépen telepíteni és elindítani.
A projekt futtatásához Node.js, npm, Angular CLI és opcionálisan ngrok szükséges.

## 1. Szükséges programok telepítése

Első lépésként telepíteni kell a Node.js LTS verzióját.

Letöltés:
https://nodejs.org

A telepítés után ellenőrizhető, hogy a Node.js és az npm megfelelően települt-e:

```bash
node -v
npm -v
```

## 2. Angular CLI telepítése

Mivel a projekt Angular alapú, szükséges az Angular CLI telepítése is.
Ez teszi lehetővé az Angular projekt fejlesztői szerverrel történő futtatását.
Az Angular CLI globális telepítése:

```bash
npm install -g @angular/cli
```

A telepítés után ellenőrizhető, hogy az Angular CLI megfelelően működik-e:

```bash
ng version
```

## 3. Projekt letöltése GitHubról

A projekt letöltéséhez a GitHub repository klónozása szükséges.

```bash
git clone https://github.com/T-M-Balazs/Interaktiv_Jatekmester_DnD_Dashboard.git
```

A parancs lefutása után létrejön egy `Interaktiv_Jatekmester_DnD_Dashboard` nevű mappa, amely tartalmazza a projekt forráskódját.

## 4. Belépés a projekt mappájába

A letöltés után be kell lépni a projekt fő mappájába:

```bash
cd Interaktiv_Jatekmester_DnD_Dashboard
```

## 5. Függőségek telepítése

A projekt működéséhez szükséges klienscsomagokat a `client` mappában kell telepíteni:

```bash
cd client
npm install
```

A projekt tartalmaz külön `server` mappát is, akkor annak a függőségeit is külön telepíteni kell.
Belépés a `server` mappába:

```bash
cd ../server
```

A szerveroldali függőségek telepítése:

```bash
npm install
```


## 6. 5eTools adatok importálása

Az importer a letöltött 5eTools repository `data` mappájából a jelenlegi Firestore-kollekciókba alakítja az adatokat. A `server` mappából futtasd:

```powershell
node import-5etools.js --data "C:\utvonal\5etools-src\data" --dry-run --limit 1
node import-5etools.js --data "C:\utvonal\5etools-src\data" --collections spells,monsters
node import-5etools.js --data "C:\utvonal\5etools-src\data" --init-only
```

A `--dry-run` csak megmutatja az első normalizált rekordot. A tényleges feltöltéshez a `server/firebase-key.json` szükséges. A `--replace` kapcsoló a korábbi dokumentumok összeolvasztása helyett teljesen lecseréli őket. Az `--init-only` csak a Firestore-struktúrát hozza létre, rekordokat nem tölt fel.

Az import a következő Firestore-struktúrát használja:

- `spells`, `items`, `monsters`, `classes`, `subclasses`, `races`, `backgrounds`, `feats`: a tényleges rendszerrekordok, dokumentumonként egy tartalommal
- `systemContent`: minden további 5eTools-típus (például condition, action, vehicle, trap, hazard, language és variant rule), amelyhez nincs külön oldal
- `systemCatalog/structure`: az importált rendszer tartalomjegyzéke
- `systemCatalog/collections/items/{collection}`: az egyes tartalmi kollekciók metaadatai

Firestore-ban nincsenek klasszikus mappák; a kollekciók az első dokumentum írásakor jelennek meg. A `systemCatalog` külön meta-struktúrája ezért nyilvántartja az üresen maradó kollekciókat is, és nem kerül be a meglévő Angular keresési eredmények közé.

Az importált, külön oldallal nem rendelkező rekordok az alkalmazás globális keresőjéből a `System Content` oldalra nyithatók meg. Ott minden megőrzött mező megjelenik, a beágyazott objektumok és tömbök is.

Az importer a rekordokat `name_source_ruleset` formájú ID-val menti, így a 2014-es és 2024-es azonos nevű tartalmak nem írják felül egymást.

## 7. Projekt futtatása lokálisan

A projekt fejlesztői szerverrel indítható el a `client` mappából:

```bash
cd ../client
npm start
```

Sikeres indítás után az alkalmazás böngészőből elérhető az alábbi címen:

```text
https://localhost:44491
```

## 7. LiveKit Cloud voice chat

A voice chat az ingyenes LiveKit Cloud projekthez csatlakozik. A kliens projektcíme:

```text
wss://dnddashboard-w7r4054w.livekit.cloud
```

A tokeneket kiadó Express API-nak szüksége van a LiveKit Cloud projekt **API key** és **API secret** értékeire. Ezeket környezeti változóként kell beállítani, mielőtt elindítod a `start-local-voice.bat` vagy `start-dnd-dashboard.bat` fájlt:

```powershell
$env:LIVEKIT_API_KEY = "a LiveKit Cloud API key értéke"
$env:LIVEKIT_API_SECRET = "a LiveKit Cloud API secret értéke"
```

Az indítófájlok már nem indítanak saját `livekit-server.exe` folyamatot, és nem igényelnek IP-cím vagy porttovábbítás beállítást.

## 8. Ngrok használata külső eléréshez

Ha az alkalmazást interneten keresztül is el szeretnénk érni, akkor használható az ngrok. Ez akkor hasznos, ha a lokálisan futó projektet másik eszközről vagy külső hálózatról is meg szeretnénk nyitni.
Először be kell állítani az ngrok hitelesítési tokent:

Ngrok token létrehozása
A folyamat egyszerű és ingyenes:
1. Regisztráció
Menj a ngrok.com oldalra, és hozz létre egy fiókot (Google vagy GitHub fiókkal is lehet).
2. Token megkeresése
Bejelentkezés után a dashboardon a bal oldali menüben keresd meg a "Your Authtoken" vagy "Auth" részt. Ott látható az egyedi tokened.
3. Token beállítása
bashngrok config add-authtoken <IDE_JÖN_A_TE_TOKENED>

```bash
.\ngrok config add-authtoken <IDE_JÖn_A_TE_TOKENED>
```

Az ngrok indítása a 4200-as porthoz:

```bash
.\ngrok.exe http 4200
```
Ezután adni fog egy linket amit más eszközökről is meg lehet nyitni


