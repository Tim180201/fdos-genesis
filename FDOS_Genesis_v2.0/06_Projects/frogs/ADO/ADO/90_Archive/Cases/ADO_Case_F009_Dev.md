# ADO Case F009 – Development Office

## Projekt
frogs. Zeiterfassung

## Empfänger
💻 Development Office / Codex

## Projektstatus
Projektphase: Sicherheitsmigration vor Go-live

Go-live Status: Nicht freigegeben

## Ausgangslage
QA F005 und F007 haben keine Freigabe erteilt. Die zentrale Ursache ist, dass die bisherige PIN-/AsyncStorage-Architektur keine belastbare serverseitige Identität für Firestore Rules bereitstellt.

F008 Architecture wurde abgeschlossen und vom Coordinator freigegeben.

## Verbindliche Arbeitsgrundlage
Lies zuerst:

- `ADO/02_Results/Result_F008_Architect.md`
- `ADO/03_Coordinator/Coordinator_Assessment_F008.md`
- `ADO/04_Risks/Risk_Register.md`
- `ADO/05_Decisions/Decision_Log.md`

Der Architekturbericht F008 ist verbindlich.

## Ziel des Sprints
Implementiere die minimale Firebase-Auth-Migration gemäß F008.

Ziel ist eine produktionsnahe, risikoarme Sicherheitsmigration. Es geht nicht um eine vollständige Neuentwicklung.

## Verbindliche Architekturentscheidungen
- Firebase Auth wird als technische Identitätsschicht eingeführt.
- Rollen und Standortzuordnungen werden in `users/{uid}` gespeichert.
- Bestehende Fachcollections bleiben erhalten.
- Bestehende `lehrer`-Dokumente werden über `authUid` oder `lehrerId` verknüpft.
- Bestehende Session-Struktur darf weiter genutzt werden, muss aber aus Firebase Auth + User-Profil abgeleitet werden.
- AsyncStorage darf nur Cache/Komfort sein, nicht Sicherheitsquelle.
- Keine Custom Claims im ersten Schritt.
- Keine neuen fachlichen Features.

## Development-Arbeitspakete

### AP1 – Firebase Auth technisch integrieren
- Firebase Auth aus dem vorhandenen Firebase SDK einbinden.
- Auth-Instanz zentral bereitstellen.
- Logout an Firebase Auth koppeln.
- Auth-State beim App-Start auswerten.

### AP2 – User-Profilmodell einführen
- Collection `users/{uid}` als Rollen-/Standortquelle einführen.
- Minimales Profilmodell gemäß F008 verwenden:
  - `uid`
  - `rolle`
  - `name`
  - `standortId`
  - `standortName`
  - `lehrerId`
  - `active`
  - `createdAt`
  - `updatedAt`
- Hilfsfunktion zum Laden des aktuellen User-Profils ergänzen.

### AP3 – Login umstellen
- `app/login.jsx` von PIN-/Firestore-Vergleich auf Firebase Auth umstellen.
- Nach Auth-Erfolg `users/{uid}` laden.
- Lokale Session aus Auth-User + User-Profil erzeugen.
- Fehlerfälle behandeln:
  - kein User-Profil
  - `active: false`
  - fehlende Rolle
  - fehlende `standortId` bei Standortleitung

### AP4 – Bestehende Nutzerverwaltung anbinden
- Nutzerverwaltung so vorbereiten/anpassen, dass Auth-UID/User-Profil berücksichtigt werden.
- Keine vollständige neue Benutzerverwaltung bauen.
- Migrationspfad für bestehende Datensätze dokumentieren.

### AP5 – Firestore Rules auf Auth umstellen
- `request.auth != null` als Basisbedingung einführen.
- `users/{uid}` als Rollen-/Standortquelle verwenden.
- Offene Reads schließen.
- Offene Deletes schließen oder rollenspezifisch erlauben.
- Write-Regeln mit Rollen-/Standortprüfung kombinieren.
- `config/preise` nur Admin schreiben lassen.
- `aenderungslog` append-only belassen.

### AP6 – Migrationsdaten / Migrationsanleitung
- Dokumentiere, wie vorhandene Admins, Standortleitungen und Lehrer zu Firebase Auth Usern werden.
- Dokumentiere erforderliche `users/{uid}`-Dokumente.
- Dokumentiere Verknüpfung zu bestehenden `lehrer`-Dokumenten.
- Keine produktiven echten Zugangsdaten in die Codebasis schreiben.

### AP7 – Session-Regression prüfen
- Alle Screens prüfen, die `session`, `rolle`, `id`, `standortId`, `standortName` verwenden.
- Kompatibilität sicherstellen oder notwendige Anpassungen dokumentieren/umsetzen.

### AP8 – Testdokumentation aktualisieren
- Firestore-Rules-Testplan um Auth-Rollenfälle erweitern.
- Manuelle Login-/Rollen-Testmatrix ergänzen.

## Mindestens zu prüfende Dateien
- `utils/db.js`
- `utils/auth.js`
- `app/login.jsx`
- `app/_layout.jsx`
- `utils/permissions.js`
- `firestore.rules`
- `app/nutzer.jsx`
- `app/einstellungen.jsx`
- `app/index.jsx`
- `app/stunden.jsx`
- `app/schueler.jsx`
- `app/scan.jsx`
- `app/export.jsx`
- `app/mehr.jsx`
- `package.json`
- vorhandene Dokumentation unter `docs/`

## Nicht Bestandteil dieses Sprints
- Keine Custom Claims.
- Kein neues Backend/Admin-SDK.
- Keine vollständige Zusammenlegung von `users` und `lehrer`.
- Keine Entfernung von Legacy-Daten.
- Keine neuen fachlichen Features.
- Kein UI-Redesign.
- Keine große Refactoring-Offensive.

## Erwartete Ausgabe
Erstelle:

`Result_F009_Dev.md`

Der Bericht muss enthalten:
- Executive Summary
- Geänderte Dateien
- Umsetzung je Arbeitspaket AP1–AP8
- Nicht umgesetzte Punkte
- Migrationsanleitung
- Risiken
- Durchgeführte Tests / nicht durchführbare Tests
- Empfehlung an QA
- Empfehlung an den Coordinator

## Definition of Done
- Firebase Auth ist technisch integriert.
- Login nutzt Firebase Auth als Sicherheitsidentität.
- `users/{uid}` ist als Rollen-/Standortquelle eingeführt.
- Session wird aus Auth + User-Profil abgeleitet.
- Firestore Rules nutzen `request.auth` und User-Profil.
- Bestehende Fachlogik bleibt soweit möglich erhalten.
- Risiken und Migrationsschritte sind dokumentiert.
- Keine neuen Features.
- Rückgabe ausschließlich an den 🧭 Coordinator.
