# ADO Case F017 – Quality Assurance Office

## Sprint
F017 – NFC Release Validation

## Rolle
🧪 Quality Assurance Office

## Priorität
P0 / Release Gate

## Ausgangslage
Sprint F016 wurde als Emergency Development Sprint zur Stabilisierung des NFC-Flows angelegt. NFC ist zentral für frogs. Zeiterfassung. Der Release Candidate bleibt blockiert, bis QA auf echter Android-Hardware bestätigt, dass NFC wieder stabil funktioniert.

## Ziel
Validiere ausschließlich die in F016 umgesetzten NFC-Änderungen und entscheide, ob der NFC-Workflow produktionsreif und für den Release Candidate freigegeben werden kann.

## Scope
Dieser Sprint prüft nur NFC und unmittelbare Regressionen im Login-/Zeiterfassungsfluss. Keine neuen Features, keine Rechnungslogik, keine Firebase-User-Provisioning-Arbeiten und keine Architekturentscheidungen.

## Pflicht-Testfälle

### 1. NFC Cold Start
- App vollständig schließen.
- NFC-Tag scannen.
- App muss automatisch öffnen.
- Lehrer-/NFC-Kontext muss korrekt erkannt werden.
- Zeiterfassung darf nicht crashen.

### 2. NFC bei geöffneter App
- App geöffnet lassen.
- NFC-Tag scannen.
- Kein Crash.
- Keine doppelte Verarbeitung.
- Keine defekte Navigation.

### 3. Start per NFC
- Unterrichtsstunde per NFC starten.
- Firestore-Eintrag prüfen.
- Startzeit, Lehrer, Schüler, Standort und Status prüfen.

### 4. Stop per NFC
- Laufende Unterrichtsstunde per NFC beenden.
- Endzeit und Dauer prüfen.
- Kein Crash beim zweiten Scan.

### 5. Button „Erfassen“
- Button „Erfassen“ aus der App heraus nutzen.
- Der Flow darf nicht crashen.
- Start/Stop muss konsistent mit NFC funktionieren.

### 6. Stundenübersicht
- Stundenliste/Stundenübersicht öffnen.
- Keine Abstürze.
- Neu erfasste Stunden müssen sichtbar und plausibel sein.

### 7. Fehlerfälle
Prüfe jeweils, dass die App nicht crasht und eine saubere Fehlermeldung bzw. sichere Rückkehr zeigt:
- ungültiger NFC-Tag
- unbekannter Tag
- fehlendes Lehrerprofil
- fehlende/abgelaufene Session
- Offline-/Netzwerkfehler
- schneller Doppel-Scan
- mehrfaches Tippen auf „Erfassen“

### 8. Regression
Mindestens kurz prüfen:
- Login
- Logout
- Session Restore
- Lehreransicht
- Adminansicht
- Standortleitungsansicht
- Firestore-Synchronisation

## Testumgebung
Tests sollen möglichst auf echter Android-Hardware erfolgen. Dokumentiere:
- Gerät
- Android-Version
- APK/Build-Version
- verwendete NFC-Tags
- Firebase-Projekt/Testdaten

## Ergebnisdatei
Erstelle nach Abschluss:

`ADO/02_Results/Result_F017_QA.md`

## Ergebnisstruktur
Die Ergebnisdatei muss enthalten:
- Kurzfazit
- Testumgebung
- Testfälle mit PASS / FAIL / BLOCKED
- reproduzierbare Fehler mit Schritten
- Screenshots/Logs, falls vorhanden
- Regressionsergebnis
- finale Einstufung:
  - ✅ PASS
  - ⚠ PASS WITH ISSUES
  - ❌ FAIL
- klare Empfehlung:
  - „Release Candidate freigeben“
  - oder „Release Candidate blockieren“

## Exit Criteria
F017 ist bestanden, wenn:
- NFC die App zuverlässig öffnet.
- NFC in der geöffneten App nicht crasht.
- Start und Stop per NFC funktionieren.
- „Erfassen“ nicht crasht.
- Fehlerfälle kontrolliert behandelt werden.
- keine kritische Regression gefunden wurde.

Nach Abschluss endet der Sprint automatisch. Übergabe ausschließlich an den 🧭 Coordinator.
