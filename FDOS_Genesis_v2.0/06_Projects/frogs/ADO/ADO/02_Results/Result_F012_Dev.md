# Result F012 Dev - Fieldtest Bugfixes

## Executive Summary

F012 behebt die im Android-Feldtest gemeldeten P1/P2-Probleme gezielt und ohne Auth-Architekturumbau. Firebase Auth bleibt unveraendert. NFC-Startlogik bleibt fachlich erhalten, der Stop-/Cold-Start-Pfad wurde stabilisiert, der Erfassen-Screen gegen fehlende Sessiondaten abgesichert und die Stundenuebersicht lesbarer gemacht.

Hinweis zur Arbeitsgrundlage: `Result_F011_DevOps.md` lag im aktuellen Repository und im bereitgestellten `ADO_frogs_v12.zip` nicht vor. Beruecksichtigt wurden daher `ADO_Case_F011_DevOps.md` und `Coordinator_Assessment_F011.md` aus dem ADO-Paket.

## Geaenderte Dateien

- `app.json`
- `plugins/withNfcIntentFilters.js`
- `utils/nfcService.js`
- `utils/db.js`
- `app/scan.jsx`
- `app/stunden.jsx`
- `ADO/02_Results/Result_F012_Dev.md`

## Ursache je Bug

### Bug 1 - NFC Stop crasht App

Der Stop-Pfad nutzte vor dem Lehrer/Schueler-Fallback zuerst eine NFC-only-Query. Unter den Auth-basierten Firestore Rules ist diese Query fuer Lehrer nicht belastbar, weil die Query die Rollenbedingung `lehrerId == eigener Lehrer` nicht ausdrueckt. Zusaetzlich wurden Android-Vibrationen ungefangen ausgefuehrt; ohne passende Permission oder bei Geraeteproblemen kann das nativ instabil werden.

### Bug 2 - Erfassen crasht

Der Erfassen-Screen konnte bereits rendern und Daten laden, bevor eine belastbare Session vorhanden war. Dadurch konnten Firestore-Queries mit fehlender ID entstehen. Ausserdem zeigte Standortleitung eine NFC-Scan-UI, obwohl NFC laut Projektregeln nur fuer Lehrer aktiv ist.

### Bug 3 - NFC Cold Start oeffnet App nicht

Die Android-Tech-Filter waren zu eng auf wenige Tag-Technologien begrenzt. Je nach Karte konnte Android die App daher nicht als passenden NFC-Handler finden. Zusaetzlich wurde die MainActivity im Config Plugin nicht explizit auf NFC-taugliche Launch-Eigenschaften abgesichert.

### Bug 4 - Stundenuebersicht Bearbeitungsfelder

Die Aktionsbuttons waren nur 30x30 Pixel gross. Mehrere Buttons hatten leeren Text oder Labels, die nicht in die Box passten. Dadurch waren am unteren Rand nur Fragmente sichtbar.

### Bug 5 - Bearbeitete Stunden

`updateEintragManuell` schrieb zwar ein Aenderungslog, setzte aber am Eintrag keinen vorhandenen Markierungsstatus. Der bestehende Status `korrigiert` wurde nicht genutzt.

## Umsetzung je Bug

### Bug 1

- `utils/db.js`: `getOffenerEintragByNfc` prueft zuerst per `lehrerId + schuelerId + bisIso == null`, danach erst per NFC-ID.
- `utils/nfcService.js`: Vibrationen laufen ueber `safeVibrate`, damit native Vibration-Fehler nicht den Workflow crashen.
- `app.json`: `android.permission.VIBRATE` ergaenzt.

### Bug 2

- `app/scan.jsx`: Session-Guard vor Datenladezugriffen ergaenzt.
- `app/scan.jsx`: Standortleitung sieht keine NFC-Ring-Erfassung mehr, sondern nur die manuelle Schuelererfassung neben eigener Arbeitszeit.

### Bug 3

- `plugins/withNfcIntentFilters.js`: MainActivity wird fuer NFC-Intents mit `exported` und `singleTask` abgesichert, sofern diese Werte noch fehlen.
- `plugins/withNfcIntentFilters.js`: `nfc_tech_filter.xml` deckt nun verbreitete Android-NFC-Technologien breiter ab (`NfcA`, `NfcB`, `NfcF`, `NfcV`, `IsoDep`, `Ndef`, `NdefFormatable`, `MifareClassic`, `MifareUltralight`).

### Bug 4

- `app/stunden.jsx`: Aktionsbuttons in der Stundenkarte sind nun Icon+Kurzlabel-Buttons mit stabiler Mindestbreite und Wrap-Verhalten.
- Leere Buttons wurden durch sichtbare Aktionen ersetzt.

### Bug 5

- `app/stunden.jsx`: Manuelles Bearbeiten setzt den vorhandenen Status `korrigiert`.

## Risiken

- NFC Cold Start kann final nur auf echter Android-Hardware mit neu gebauter APK validiert werden.
- Die Manifest-Aenderungen greifen erst nach neuem Prebuild/EAS Build.
- Bestandsdaten ohne `visibleForLehrerIds` bleiben weiterhin ein Migrationsrisiko fuer Lehrer-Schueler-Zugriffe.
- Firestore Rules wurden weiterhin nicht im Emulator getestet.

## Durchgefuehrte Tests

- `node --check utils/db.js`
- `node --check utils/nfcService.js`
- `node --check plugins/withNfcIntentFilters.js`
- `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))"`
- `git diff --check`

Nicht durchgefuehrt:
- Kein Android-NFC-Geraet in dieser Entwicklungsumgebung.
- Kein Expo/Metro-Laufzeittest, da keine installierten `node_modules` vorhanden sind.
- Kein Firestore-Rules-Emulatortest, da kein Emulator-Setup vorhanden ist.

## Empfehlung an QA

1. Neue APK bauen und installieren.
2. Als Lehrer einloggen und Erfassen-Screen oeffnen.
3. NFC-Start vom Dashboard erneut testen.
4. Zweiten NFC-Scan derselben Karte testen: Stunde muss stoppen, App bleibt offen.
5. App komplett schliessen und NFC-Tag scannen: App muss starten.
6. Standortleitung pruefen: Erfassen-Screen oeffnet, Arbeitszeit und manuelle Schuelererfassung sichtbar, keine NFC-Erwartung.
7. Stundenuebersicht auf kleinem Android-Display pruefen: Aktionsbuttons voll sichtbar.
8. Stunde bearbeiten und pruefen, ob Status `korrigiert` sichtbar ist.

## Empfehlung an Coordinator

Vor erneuter Freigabe sollte Coordinator einen Android-Feldtest mit dem neuen Build koordinieren. Besonders wichtig sind NFC Cold Start, NFC Stop und Erfassen-Screen je Rolle. Das fehlende `Result_F011_DevOps.md` sollte im ADO-Archiv nachgetragen oder als bewusst fehlend dokumentiert werden.
