# ADO Case F015 – Development Office – Firebase User Provisioning

## Projekt
frogs. Zeiterfassung

## Empfänger
💻 Development Office / Codex

## Sprinttyp
Feature-Sprint nach bzw. getrennt von RC-Blocker-F014.

## Ausgangslage
Firebase Auth ist eingeführt. Login, Session Restore und rollenbasierte Profile über `users/{uid}` sind grundsätzlich vorhanden. Aktuell müssen Auth-User und Firestore-Profile jedoch teilweise außerhalb der App vorbereitet werden.

## Ziel
Die Benutzerverwaltung soll vollständig in die frogs.-App integriert werden. Administratoren legen Lehrer und Standortleitungen ausschließlich über die App an. Die App übernimmt die technische Benutzeranlage und die fachliche Profil-/Referenzanlage.

## Gewünschter Ablauf – Neuer Lehrer
Admin öffnet „Neuer Lehrer“.

Eingaben:
- Name
- E-Mail
- Passwort
- Standort
- Lehrerdaten

Nach Speichern:
- Firebase Authentication User wird erstellt.
- Firestore-Dokument `users/{uid}` wird automatisch angelegt.
- Fachcollection `lehrer` wird erstellt bzw. verknüpft.
- Rollen-, Standort- und Referenzinformationen werden konsistent gespeichert.

Beispiel `users/{uid}` für Lehrer:
```json
{
  "uid": "<authUid>",
  "rolle": "lehrer",
  "name": "...",
  "active": true,
  "standortId": "...",
  "standortName": "...",
  "lehrerId": "..."
}
```

## Gewünschter Ablauf – Neue Standortleitung
Admin öffnet „Neue Standortleitung“.

Eingaben:
- Name
- E-Mail
- Passwort
- Standort

Nach Speichern:
- Firebase Authentication User wird erstellt.
- Firestore-Dokument `users/{uid}` wird automatisch angelegt.
- Standortzuordnung wird gespeichert.

Beispiel `users/{uid}` für Standortleitung:
```json
{
  "uid": "<authUid>",
  "rolle": "standort",
  "name": "...",
  "active": true,
  "standortId": "...",
  "standortName": "..."
}
```

## Anforderungen
1. Benutzeranlage nur durch Administratoren.
2. Firebase Auth User per E-Mail und Passwort erstellen.
3. `users/{uid}` mit UID als Dokument-ID erstellen.
4. Bestehende Fachcollections `lehrer` und `standorte` beibehalten.
5. Lehrerprofil mit `lehrerId` verknüpfen.
6. Standortinformationen konsistent speichern.
7. Keine Rückkehr zur PIN-Logik.
8. Fehler verständlich anzeigen.
9. Teilfehler sauber behandeln, insbesondere:
   - E-Mail bereits vergeben
   - ungültiges Passwort
   - fehlender Standort
   - Firestore Permission Denied
   - Netzwerkfehler
10. Rollback-Strategie dokumentieren und soweit technisch sinnvoll umsetzen.

## Technische Hinweise
Prüfe insbesondere:
- `app/nutzer.jsx`
- `utils/auth.js`
- `utils/db.js`
- Firebase Client SDK Grenzen
- Admin-SDK-Verfügbarkeit bzw. fehlende Admin-SDK-Verfügbarkeit in der App
- Firestore Rules

## Wichtige Architekturentscheidung
Falls Firebase Auth User aus der Client-App nicht sicher für andere Benutzer erzeugt werden können, darf keine unsichere Umgehung gebaut werden. Dann ist eine sichere Minimalvariante vorzuschlagen, z. B. Cloud Function / Backend-Endpunkt für Admin-Provisioning.

## Nicht Bestandteil
- Standortmodell abschaffen
- Rollenmodell neu entwerfen
- Custom Claims erzwingen
- komplettes UI-Redesign
- bestehende Nutzer migrieren, außer es ist für die Funktion zwingend erforderlich

## Ergebnis
Erstelle nach Abschluss:

`ADO/02_Results/Result_F015_Dev.md`

Dokumentiere:
- geänderte Dateien
- implementierten Ablauf
- Fehlerbehandlung
- offene Risiken
- Testhinweise
