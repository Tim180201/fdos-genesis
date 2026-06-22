# ADO Case F016 – Development Office – NFC Emergency Stabilization

## Rolle
💻 Development Office

## Priorität
P0 / Release-Blocker / Emergency Sprint

## Hintergrund
Im aktuellen Feldtest ist die NFC-Zeiterfassung erneut vollständig instabil:

- NFC öffnet die App nicht mehr.
- NFC-Scan innerhalb der geöffneten App führt zum Absturz.
- Button/Flow `Erfassen` führt zum Absturz.

Damit ist der wichtigste produktive Erfassungsweg blockiert. RC1 ist bis zur vollständigen NFC-Stabilisierung gesperrt.

## Sprintziel
Stelle die NFC-Funktion vollständig und robust wieder her.

Dieser Sprint hat genau eine fachliche Aufgabe:

> NFC muss auf echter Android-Hardware zuverlässig funktionieren.

Alle anderen Sprints, Features und Refactorings sind bis zum Abschluss von F016 nachrangig.

## Verbindliche Anforderungen

### 1. NFC Cold Start
- Ein Scan bei geschlossener App muss die App zuverlässig öffnen.
- Der Intent/Deep-Link/Android-Launch-Pfad darf nicht ins Leere laufen.
- Fehlerhafte oder unbekannte NFC-Payloads dürfen die App nicht crashen.

### 2. NFC Scan bei geöffneter App
- Ein Scan innerhalb der laufenden App darf niemals zum Absturz führen.
- Der NFC-Handler muss mehrfach hintereinander scanbar sein.
- Doppelte Events, Race Conditions und bereits laufende Verarbeitung müssen abgefangen werden.

### 3. Erfassen-Flow
- Der Button/Flow `Erfassen` darf nicht abstürzen.
- Der Screen muss auch bei fehlenden, verzögerten oder ungültigen Daten stabil bleiben.
- Lade-, Fehler- und Leerzustände müssen abgesichert sein.

### 4. Start/Stop-Logik
- NFC Start muss eine Zeiterfassung korrekt beginnen.
- NFC Stop muss eine laufende Zeiterfassung korrekt beenden.
- Zweiter Scan darf keine App-Crashs verursachen.
- Unklare Zustände müssen sauber abgefangen und für den Nutzer verständlich angezeigt werden.

### 5. Rollen- und Session-Sicherheit
- NFC darf nur mit gültiger Firebase-Auth-Session verarbeitet werden.
- Lehrer-Kontext, `users/{uid}`, `lehrerId`, `standortId` und zugehörige Daten müssen vor Verwendung geprüft werden.
- Fehlende Profile oder Rechte dürfen nicht crashen, sondern müssen eine klare Fehlermeldung erzeugen.

### 6. Stabilität vor Optik
- Keine neuen Features.
- Keine Architekturänderungen außerhalb der NFC-Stabilisierung.
- Keine kosmetischen Arbeiten, außer sie sind nötig, um Lade-/Fehlerzustände sichtbar zu machen.

## Erwartete technische Prüfung
Development muss mindestens prüfen und dokumentieren:

- Android Manifest / Intent Filter für NFC.
- App-Startpfad aus NFC-Intent.
- `NfcManager` / Listener Lifecycle.
- Cleanup bei Screen-Wechsel und App-State-Wechsel.
- Guards gegen null/undefined Daten.
- Guards gegen parallele NFC-Verarbeitung.
- Fehlerbehandlung bei Firestore/Auth-Zugriffen.
- Verhalten bei fehlendem Lehrerprofil.
- Verhalten bei bereits laufender Stunde.
- Verhalten bei Stop ohne laufende Stunde.

## Akzeptanzkriterien
F016 gilt erst als abgeschlossen, wenn auf echter Android-Hardware nachweislich funktioniert:

1. App geschlossen → NFC Scan → App öffnet stabil.
2. App geöffnet → NFC Scan → kein Crash.
3. `Erfassen` öffnen → kein Crash.
4. NFC Start → Stunde beginnt korrekt.
5. NFC Stop → Stunde endet korrekt.
6. Mehrfachscans schnell hintereinander → kein Crash.
7. Ungültiger NFC-Tag → kein Crash, verständliche Meldung.
8. Fehlende Session / fehlendes Profil → kein Crash, verständliche Meldung.

## Ergebnisdatei
Erstelle nach Abschluss:

`ADO/02_Results/Result_F016_Dev.md`

## Ergebnisinhalt
Das Result muss enthalten:

- Zusammenfassung der Ursache(n)
- Geänderte Dateien
- Konkrete Fixes
- Testnachweis auf echter Android-Hardware
- Offene Restrisiken
- Empfehlung für QA-Folgesprint

## Coordinator-Entscheidung
F016 blockiert alle anderen offenen Arbeiten.

F014 und F015 bleiben erhalten, werden aber nicht fortgeführt, bis NFC stabil ist.

Nach F016 folgt zwingend QA-Regression mit Fokus NFC.
