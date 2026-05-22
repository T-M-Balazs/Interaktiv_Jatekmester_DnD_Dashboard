# Szakdolgozat projekt futtatása

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
git clone https://github.com/T-M-Balazs/Szakdolgozat.git
```

A parancs lefutása után létrejön egy `Szakdolgozat` nevű mappa, amely tartalmazza a projekt forráskódját.

## 4. Belépés a projekt mappájába

A letöltés után be kell lépni a projekt fő mappájába:

```bash
cd Szakdolgozat
```

## 5. Függőségek telepítése

A projekt működéséhez szükséges npm csomagokat telepíteni kell. Ezt a projekt fő mappájában az alábbi paranccsal lehet megtenni:

```bash
npm install
```

A projekt tartalmaz külön `server` mappát is, akkor annak a függőségeit is külön telepíteni kell.
Belépés a `server` mappába:

```bash
cd server
```

A szerveroldali függőségek telepítése:

```bash
npm install
```


## 6. Projekt futtatása lokálisan

A projekt fejlesztői szerverrel indítható el. A fő projektmappában a következő parancsot kell futtatni:

```bash
ng serve --host 0.0.0.0 --port 4200 --disable-host-check
```

Sikeres indítás után az alkalmazás böngészőből elérhető az alábbi címen:

```text
http://localhost:4200
```

## 7. Ngrok használata külső eléréshez

Ha az alkalmazást interneten keresztül is el szeretnénk érni, akkor használható az ngrok. Ez akkor hasznos, ha a lokálisan futó projektet másik eszközről vagy külső hálózatról is meg szeretnénk nyitni.
Először be kell állítani az ngrok hitelesítési tokent:

```bash
.\ngrok config add-authtoken 3Bj8HYxX3HixTcigoGVNuTJLrDG_68mLXuqJJXLPcEfBNQoWS
```

Az ngrok indítása a 4200-as porthoz:

```bash
.\ngrok.exe http 4200
```

A parancs lefutása után az ngrok létrehoz egy publikus URL-t. Ezen az URL-en keresztül az alkalmazás külső hálózatról is elérhető.
Ngrok indítása külön terminálablakban:

```bash
.\ngrok.exe http 4200
```
