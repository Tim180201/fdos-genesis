# Coordinator Assessment – F013 QA / Field Findings

## Ergebnis
Feldtests zeigen: Die App ist deutlich näher an RC1, aber es bestehen neue RC-Blocker.

## Bestätigt funktionsfähig
- Firebase Auth Login
- Admin Login
- Lehrer Login
- Session Restore
- Logout
- APK Installation
- NFC Cold Start öffnet die App
- NFC Start funktioniert

## Offene Blocker / Bugs
- Lehrer: Stunden crasht.
- Lehrer: NFC Stop crasht weiterhin.
- Bearbeitete Stunden dürfen Status nicht verlieren.
- PIN-Felder in Nutzeranlage sind nach Firebase Auth veraltet.
- Admin kann keine Standorte anlegen.
- Standortleitung kann Schüler nicht nachträglich Standort zuweisen.
- NFC-Scan-Feedback soll beschleunigt oder visuell überbrückt werden.

## Coordinator-Entscheidung
Nächster Sprint: F014 Development Office / Codex.

## Hinweis
Standortmodell bleibt für Version 1.0 erhalten. Eine mögliche Vereinfachung des Standortmodells wird in das Backlog für Version 1.1 verschoben.
