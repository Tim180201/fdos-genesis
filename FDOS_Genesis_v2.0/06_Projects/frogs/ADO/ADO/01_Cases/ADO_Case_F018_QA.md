# ADO Case F018 – Quality Assurance Office / Full App Regression with NFC Priority

## Rolle

🧪 Quality Assurance Office

## Sprint-Typ

QA / Release Candidate Validation

## Ausgangslage

Die App wurde nach den NFC-Blockern und den aktuellen ADO-Sprints erneut für eine ganzheitliche Prüfung vorgesehen.

Aktueller Schwerpunkt bleibt NFC, da dort zuletzt kritische Blocker gemeldet wurden:

- NFC öffnete die App nicht mehr zuverlässig.
- NFC-Scan innerhalb der geöffneten App führte zu Abstürzen.
- Der Flow/Button „Erfassen“ führte zu Abstürzen.
- NFC Start/Stop ist releasekritisch, weil die Zeiterfassung im Feld davon abhängt.

## Ziel

QA prüft die App gegen alle aktuell dokumentierten Anforderungen und entscheidet, ob die App in Richtung Release Candidate weitergeführt werden darf.

Höchstes Augenmerk liegt auf NFC. NFC-Fehler sind automatisch RC-blockierend.

## Arbeitsgrundlage

Arbeite ausschließlich auf Basis der bereitgestellten Projekt-ZIP.

Lies zuerst:

- `ADO/99_Handover/Coordinator_Handover_Protocol.md`
- `ADO/00_README.md`
- `ADO/01_Delivery/Sprint_Board.md`
- `ADO/00_Core/Project_Status.md`
- `ADO/00_Core/Decision_Log.md`
- `ADO/00_Core/Risk_Register.md`

Berücksichtige zusätzlich alle vorhandenen relevanten Results, insbesondere:

- `ADO/02_Results/Result_F014_Dev.md` falls vorhanden
- `ADO/02_Results/Result_F015_Dev.md` falls vorhanden
- `ADO/02_Results/Result_F016_Dev.md` falls vorhanden
- `ADO/02_Results/Result_F017_QA.md` falls vorhanden

## Scope

### A. NFC – höchste Priorität / Release Blocker

QA muss mindestens prüfen:

1. App geschlossen → NFC-Scan öffnet die App zuverlässig.
2. App geöffnet → NFC-Scan wird verarbeitet, ohne Crash.
3. App im Hintergrund → NFC-Scan bringt die App sauber in den Vordergrund.
4. NFC Start → Stunde wird korrekt gestartet.
5. NFC Stop → aktive Stunde wird korrekt beendet.
6. Button/Flow „Erfassen“ → kein Crash.
7. Stundenübersicht nach NFC-Start/Stop → kein Crash.
8. Schneller Doppel-Scan → kein Crash, keine doppelten/inkonsistenten Stunden.
9. Mehrfach-Scans in kurzer Folge → stabil.
10. Ungültiger NFC-Tag → klare Fehlermeldung, kein Crash.
11. Unbekannter Lehrer/fehlendes Profil → klare Fehlermeldung, kein Crash.
12. Fehlende oder abgelaufene Session → sauberer Login-/Fehlerflow, kein Crash.
13. Offline-/Netzwerkfehler → sauber abgefangen, kein Crash.
14. Firestore-Schreibvorgänge für Start/Stop sind plausibel und konsistent.
15. Nach App-Neustart bleibt der Status der aktiven/abgeschlossenen Stunde korrekt.

### B. Authentifizierung und Rollen

Prüfen:

- Admin-Login
- Lehrer-Login
- Standortleitungs-Login
- Logout
- Session Restore
- Zugriffsbeschränkungen je Rolle
- Kein Rollenwechsel ohne Berechtigung

### C. Lehrer-Workflow

Prüfen:

- Stundenliste öffnet ohne Crash.
- Stunden starten/beenden funktioniert.
- Manuell korrigierte Stunden bleiben als geändert/korrigiert markiert.
- Lehrer können den Status bearbeiteter/korrigierter Stunden nicht unzulässig ändern.

### D. Admin-Workflow

Prüfen:

- Lehrer anlegen/bearbeiten.
- Standortleitungen anlegen/bearbeiten.
- Standorte anlegen.
- Schüler anlegen/bearbeiten.
- Pflichtfelder und Validierung.
- Keine PIN-Felder bei Lehrer-/Standortleitungsanlage, sofern diese laut aktuellem Stand entfernt sein müssen.

### E. Standortleitungs-Workflow

Prüfen:

- Standortdaten sichtbar.
- Schüler können einem Standort nachträglich zugeordnet werden.
- Zugriff bleibt auf zulässige Standortdaten beschränkt.

### F. Firestore / Datenkonsistenz

Prüfen:

- Start-/Stop-Daten sind korrekt.
- Standortzuordnungen sind korrekt.
- Rollen-/User-Dokumente bleiben konsistent.
- Keine doppelten oder verwaisten Zeitdatensätze durch NFC.
- Berechtigungsfehler werden verständlich behandelt.

### G. Regression / Stabilität

Prüfen:

- App-Start
- Navigation
- Hauptmenüs je Rolle
- relevante Listenansichten
- Formularvalidierungen
- App-Neustart nach aktiver Stunde
- Verhalten bei langsamem Netzwerk

## Testumgebung

QA soll möglichst auf echter Android-Hardware testen.

Dokumentiere:

- Gerät(e)
- Android-Version(en)
- App/APK-Version oder Build-Referenz
- Firebase-Projekt/Umgebung, falls erkennbar
- NFC-Tag-Typ, falls erkennbar

## Ergebnisdatei

Erstelle:

`ADO/02_Results/Result_F018_QA.md`

## Ergebnisstruktur

Das Result muss enthalten:

1. Zusammenfassung
2. Testumgebung
3. NFC-Testmatrix mit PASS/FAIL pro Testfall
4. Allgemeine Regressionsmatrix mit PASS/FAIL pro Bereich
5. Gefundene Fehler mit Reproduktionsschritten
6. Schweregrad je Fehler
7. Screenshots/Logs, falls vorhanden
8. Einschätzung der Datenkonsistenz
9. RC-Empfehlung:
   - `Release Candidate freigeben`
   - `Release Candidate blockieren`
10. Falls blockiert: minimal notwendiger Folgesprint

## Akzeptanzkriterien

Der Sprint gilt nur als PASS, wenn:

- NFC in allen Kernfällen stabil funktioniert.
- Keine NFC-Crashes auftreten.
- „Erfassen“ nicht crasht.
- Start/Stop-Daten konsistent gespeichert werden.
- Es keine kritischen Regressionen in Auth, Rollen oder Zeiterfassung gibt.

## Harte Blocker

Folgende Punkte blockieren den Release Candidate automatisch:

- App öffnet durch NFC nicht zuverlässig.
- NFC-Scan crasht die App.
- „Erfassen“ crasht die App.
- NFC Stop beendet Stunden nicht korrekt.
- Doppelte oder beschädigte Zeitdatensätze entstehen.
- Login/Session Restore ist defekt.
- Firestore-Schreibvorgänge sind inkonsistent.

## Nicht im Scope

- Neue Features implementieren
- Code ändern
- Architekturentscheidungen treffen
- Billing/Rechnungsfeature testen, sofern nicht bereits implementiert

Nach Abschluss endet der Sprint automatisch und geht zurück an den 🧭 Coordinator.
