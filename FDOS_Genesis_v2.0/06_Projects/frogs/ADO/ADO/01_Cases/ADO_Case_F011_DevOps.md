# ADO Case F011 – DevOps Office

## Projekt
frogs. Zeiterfassung

## Empfänger
🚀 DevOps Office

## Projektstatus
Projektphase: Go-live Validation / DevOps Readiness

Go-live Status: Nicht freigegeben

## Ausgangslage
F009 Development hat Firebase Auth eingeführt. F010 QA bestätigt, dass die Security-Architektur deutlich verbessert wurde, aber keine Go-live-Freigabe möglich ist, weil produktionsnahe Nachweise, Testdaten, Migrationen und operative Vorbereitung fehlen.

## Ziel des Sprints
Bereite die Firebase-/Deploy-/Testumgebung so vor, dass QA F012 die Auth-Migration und Firestore Rules belastbar prüfen kann.

Dieser Sprint ist kein Feature- und kein Development-Sprint.

## Arbeitsgrundlage
Lies insbesondere:

- `ADO/02_Results/Result_F009_Dev.md`
- `ADO/02_Results/Result_F010_QA.md`
- `ADO/03_Coordinator/Coordinator_Assessment_F010.md`
- `ADO/00_Core/Project_Status.md`
- `ADO/00_Core/Risk_Register.md`
- `docs/AUTH_MIGRATION_GUIDE.md`
- `docs/AUTH_MANUAL_TESTPLAN.md`
- `docs/FIRESTORE_RULES_TESTPLAN.md`
- `docs/NFC_MANUAL_TESTPLAN.md`

## Aufgaben

### 1. Firebase Auth Testuser vorbereiten
Erstelle oder dokumentiere konkret die benötigten Testuser:

- Admin
- Standortleitung
- Lehrer

Für jeden Testuser müssen vorhanden sein:

- Firebase Auth User
- `users/{uid}`-Profil
- korrekte Rolle
- korrekte `active`-Einstellung
- korrekte Standort-/Lehrer-Verknüpfung

Keine echten produktiven Passwörter in Dokumente schreiben.

### 2. `users/{uid}`-Profile und Bestandsverknüpfung prüfen
Prüfe und dokumentiere:

- Admin-Profil
- Standortleitungsprofil mit `standortId`
- Lehrerprofil mit `lehrerId`
- Verknüpfung zu bestehenden `lehrer/{id}`-Dokumenten

### 3. `visibleForLehrerIds`-Migration vorbereiten/nachweisen
Erstelle oder dokumentiere den konkreten Migrationsnachweis für bestehende Lehrer-Schüler-Zuordnungen.

Ziel:
Lehrer können unter den neuen Rules ihre zugeordneten Schüler lesen.

### 4. Firestore Rules Test vorbereiten/ausführen
Führe nach Möglichkeit Firestore Rules Tests im Emulator oder isolierten Firebase-Testprojekt aus.

Mindestens zu prüfen:

- nicht authentifizierter Zugriff wird abgelehnt
- Admin darf globale Daten
- Standortleitung darf nur eigenen Standortkontext
- Lehrer darf eigene Schüler/Stunden
- Lehrer darf keine fremden Schüler/Stunden
- `config/preise` nur Admin schreibbar
- `aenderungslog`-Zugriff entsprechend aktueller Rules
- Deletes eingeschränkt

Wenn Tests technisch nicht ausführbar sind, dokumentiere exakt warum und welche manuelle Ersatzprüfung erfolgt ist.

### 5. Firestore Rules Deploy-Readiness
Dokumentiere:

- welche Rules deployt werden sollen
- ob Deploy möglich war
- welche Firebase-Projektumgebung verwendet wurde
- ob Indexanforderungen aufgetreten sind

Keine produktiven Secrets dokumentieren.

### 6. Build-/Runtime-Readiness prüfen
Prüfe soweit möglich:

- `package.json`
- Expo-/Build-Kommandos
- Firebase-Konfiguration
- offensichtliche fehlende Abhängigkeiten
- Start-/Buildfähigkeit

### 7. NFC-Gerätetest vorbereiten
DevOps muss NFC nicht fachlich abnehmen, aber die Voraussetzungen für QA klären:

- Android-Testgerät vorhanden?
- NFC aktiv?
- Testkarten vorhanden?
- Testuser/Testschüler vorhanden?
- App-Build installierbar?

### 8. QA F012 vorbereiten
Erstelle eine klare Übergabe an QA mit:

- Testuser-Übersicht ohne Passwörter
- vorbereiteten Testdaten
- durchgeführten DevOps-Prüfungen
- offenen Risiken
- Hinweisen für Firestore Rules
- Hinweisen für NFC-Test

## Nicht Bestandteil dieses Sprints
- Keine neuen App-Features
- Keine UI-Änderungen
- Keine Auth-Architekturänderung
- Keine Code-Refactorings
- Keine produktiven Secrets in Dokumenten
- Keine Go-live-Freigabe durch DevOps

## Erwartete Ausgabe
Erstelle:

`Result_F011_DevOps.md`

Der Bericht muss enthalten:

- Executive Summary
- verwendete Umgebung
- Testuser-/Profilstatus
- Migrationsstatus `visibleForLehrerIds`
- Firestore Rules Teststatus
- Rules Deploy-Status
- Build-/Runtime-Status
- NFC-Testvorbereitung
- offene Risiken
- Empfehlung an QA
- Empfehlung an Coordinator

## Definition of Done
- DevOps-Readiness ist dokumentiert.
- QA kann F012 mit belastbarer Arbeitsgrundlage starten.
- Testdaten/Migrationsstatus sind nachvollziehbar.
- Firestore Rules Test-/Deploystatus ist dokumentiert.
- Keine Secrets wurden offengelegt.
- Übergabe erfolgt ausschließlich an den 🧭 Coordinator.
