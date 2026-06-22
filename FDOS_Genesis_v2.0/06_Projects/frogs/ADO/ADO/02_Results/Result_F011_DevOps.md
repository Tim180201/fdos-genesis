# Result_F011_DevOps.md

# Result F011 DevOps – Firebase Readiness & QA Preparation

## Executive Summary

Sprint F011 wurde auf Basis der bereitgestellten Projektdateien durchgeführt.

Ziel war die Vorbereitung einer belastbaren Firebase-/Deploy-/Testumgebung für die QA-Prüfung der Firebase-Auth-Migration aus F009.

Die technische Analyse bestätigt:

- Firebase Auth wurde integriert.
- Das Profilmodell `users/{uid}` ist dokumentiert.
- Firestore Rules wurden auf Auth + Rollenprofile umgestellt.
- Ein Emulator-Testsetup ist weiterhin nicht Bestandteil des Repositories.
- Reale Firebase-Testdaten sind nicht Bestandteil der Projektdatei.
- Die für QA erforderlichen Testprofile und Migrationsnachweise müssen im Testprojekt vorbereitet werden.

Go-Live-Freigabe ist nicht Bestandteil dieses Sprints.

## Verwendete Umgebung

### Projekt
frogs. Zeiterfassung

### Build-Konfiguration
package.json:
- Expo SDK 54
- React 19.1.0
- React Native 0.81.5
- Firebase 12.13.0
- react-native-nfc-manager 3.17.2

Vorhandene Skripte:
- npm start
- npm run android
- npm run build

Build:
```bash
eas build -p android
```

### Firebase
Dokumentiert in:
- docs/AUTH_MIGRATION_GUIDE.md
- firestore.rules

Ein vollständiges Emulator-Setup befindet sich nicht im Repository.

## Testuser-/Profilstatus

### Admin-Testprofil
Firebase Auth User: erforderlich, nicht im Repository enthalten.

users/{uid}:
```json
{
  "uid": "<auth_uid>",
  "rolle": "admin",
  "name": "Test Admin",
  "active": true
}
```

Status: Vorzubereiten im Firebase-Testprojekt.

### Standortleitung-Testprofil
Firebase Auth User: erforderlich.

users/{uid}:
```json
{
  "uid": "<auth_uid>",
  "rolle": "standort",
  "name": "Test Standortleitung",
  "active": true,
  "standortId": "<standort_id>",
  "standortName": "<standort_name>"
}
```

Status: Vorzubereiten im Firebase-Testprojekt.

### Lehrer-Testprofil
Firebase Auth User: erforderlich.

users/{uid}:
```json
{
  "uid": "<auth_uid>",
  "rolle": "lehrer",
  "name": "Test Lehrer",
  "active": true,
  "standortId": "<standort_id>",
  "standortName": "<standort_name>",
  "lehrerId": "<bestehende_lehrer_id>"
}
```

Optional im bestehenden Lehrer-Dokument:
```json
{
  "authUid": "<auth_uid>"
}
```

Status: Vorzubereiten im Firebase-Testprojekt.

## Prüfung der Bestandsverknüpfung

Gemäß AUTH_MIGRATION_GUIDE:

```text
users/{uid}.lehrerId
          ↓
lehrer/{id}
```

Bewertung: Konzept dokumentiert. Nachweis echter produktiver Verknüpfungen konnte innerhalb der ZIP nicht erbracht werden.

## Migrationsstatus visibleForLehrerIds

Dokumentierte Anforderung:

```text
schueler.visibleForLehrerIds
```

muss für bestehende Lehrer-Schüler-Zuordnungen nachgezogen werden.

Status:
- Konzept dokumentiert
- Migration nicht nachgewiesen
- QA muss Nachweis im Testprojekt prüfen

## Firestore Rules Teststatus

Geprüfte Grundlage:
- firestore.rules
- docs/FIRESTORE_RULES_TESTPLAN.md

Feststellung: Kein Emulator-Testlauf im Repository nachweisbar.

Status: Nicht automatisiert getestet.

## Rules Deploy-Status

Vorhanden:
- firestore.rules

Nicht vorhanden:
- firebase.json
- Emulator-Konfiguration
- Deploy-Protokoll
- Testprojekt-Konfiguration

Deploy-Status: Nicht nachweisbar.

Indexstatus: Keine Indexdefinition im Repository gefunden.

## Build-/Runtime-Status

Build-Struktur plausibel. Nicht vorhanden:
- test
- lint
- emulator
- rules-test

Bewertung: Buildfähigkeit plausibel, aber nicht reproduzierbar nachgewiesen.

## NFC-Testvorbereitung

Repository enthält:
```text
react-native-nfc-manager
utils/nfcService.js
```

Für QA F012 erforderlich:
- Android-Gerät
- NFC aktiviert
- NFC-Testkarten
- Lehrer-Testprofil
- Testschüler
- installierbarer Android-Build

Status: Hardware innerhalb der ZIP nicht prüfbar.

## Offene Risiken

### Kritisch
- Keine Testuser nachgewiesen
- Keine users/{uid}-Profile nachgewiesen
- Keine visibleForLehrerIds-Migration nachgewiesen
- Keine Emulator-Rules-Tests
- Keine NFC-Gerätetests

### Hoch
- Mögliche fehlende Firestore-Indizes
- Nutzerverwaltung erzeugt keine Firebase-Auth-User
- Erstadmin muss manuell gebootstrapped werden

## Empfehlung an QA

Vor F012:
1. Firebase-Testprojekt bereitstellen
2. Drei Testuser anlegen: Admin, Standortleitung, Lehrer
3. users/{uid}-Profile anlegen
4. Lehrer-Verknüpfung prüfen
5. visibleForLehrerIds nachziehen
6. Firestore Rules deployen
7. Dokumentierte Testfälle vollständig ausführen
8. NFC-Test auf Android-Hardware durchführen

## Empfehlung an Coordinator

Kein weiterer Development-Sprint erforderlich, bevor die operativen Nachweise erbracht wurden.

Empfohlener nächster Schritt:
F012 QA mit Firebase-Testprojekt, vorbereiteten Testprofilen, deployten Rules, Migrationsnachweis und NFC-Gerätetest als Quality Gate vor jeder Go-Live-Entscheidung.

## Übergabe

Sprint F011 abgeschlossen.

Übergabe ausschließlich an den 🧭 Coordinator.
