# ADO Case F014 – Development Office – RC Blocker Bugfix

## Projekt
frogs. Zeiterfassung

## Empfänger
💻 Development Office / Codex

## Projektstatus
Projektphase: RC-Blocker-Bugfix vor Release Candidate

## Ausgangslage
Die App wurde auf echter Android-Hardware getestet.

Bestätigt funktionsfähig:
- Firebase Auth Login
- Admin Login
- Lehrer Login
- Session Restore
- Logout
- APK Installation
- NFC Cold Start öffnet die App
- NFC Start funktioniert

Offen sind neue Feldtest-Bugs und letzte Produktivblocker.

## Ziel
Behebe ausschließlich die unten genannten RC-Blocker und wichtigen Produktivbugs.

Keine Architekturänderung.
Keine Entfernung des Standortmodells.
Keine neuen Features außerhalb der beschriebenen Bugs.

---

# P1 – Go-live-Blocker

## Bug 1 – Lehrer: Klick auf "Stunden" crasht App

Ist-Zustand:
- Lehrer ist angemeldet.
- Beim Öffnen des Bereichs "Stunden" stürzt die App ab.

Erwartung:
- Stundenbereich öffnet stabil.
- Lehrer sieht nur eigene Stunden.
- Falls keine Daten vorhanden sind, wird ein leerer Zustand angezeigt.
- Kein Crash.

Bitte prüfen insbesondere:
- `app/stunden.jsx`
- Session-Felder nach Firebase Auth
- `lehrerId`
- Firestore Rules / Query-Kompatibilität
- Zugriff auf Schüler-/Zuordnungsdaten
- Fehlerbehandlung bei fehlenden oder leeren Daten

---

## Bug 2 – Lehrer: NFC Stop crasht weiterhin

Ist-Zustand:
- Lehrer kann per NFC eine Stunde starten.
- Beim zweiten Scan derselben Karte zum Stoppen stürzt die App ab.

Erwartung:
- Zweiter Scan beendet die offene Stunde.
- Kein Crash.
- Wenn Stop nicht möglich ist, erscheint eine verständliche Fehlermeldung.
- App bleibt stabil.

Bitte prüfen insbesondere:
- `utils/nfcService.js`
- `utils/db.js`
- `getOffenerEintragByNfc`
- Stop-/Update-Pfad
- Firestore Rules / Permission-Denied
- Fehlerbehandlung im NFC-Callback

---

## Bug 3 – Bearbeitete Stunden dürfen Status nicht verlieren

Ist-Zustand:
- Manuell geänderte Stunden werden als korrigiert markiert.
- Der Lehrer kann offenbar den Status wieder verändern bzw. die Markierung verlieren lassen.

Erwartung:
- Sobald eine Stunde manuell geändert wurde, muss sie dauerhaft als geändert/korrigiert markiert bleiben.
- Lehrer darf diese Markierung nicht entfernen.
- Status `korrigiert` darf durch spätere Bearbeitung nicht überschrieben werden.
- Falls Statusauswahl vorhanden ist, darf `korrigiert` nicht versehentlich abwählbar sein.

Bitte prüfen insbesondere:
- `app/stunden.jsx`
- `utils/db.js`
- Update-Funktionen für Stunden/Einträge
- vorhandene Felder `status`, `korrigiert`, `geaendertAm`, `aenderungslog`

---

# P2 – Wichtige Produktivbugs

## Bug 4 – PIN-Feld bei Lehreranlage entfernen

Ist-Zustand:
- Beim Anlegen von Lehrern ist noch ein Feld `PIN` sichtbar.

Erwartung:
- PIN-Feld wird nicht mehr angezeigt.
- Firebase Auth ist der Login-Weg.
- Keine alte PIN-Logik für neue Lehrer.

Bitte prüfen:
- `app/nutzer.jsx`
- Formularlogik für Lehrer

---

## Bug 5 – PIN-Feld bei Standortleitungsanlage entfernen

Ist-Zustand:
- Beim Anlegen von Standortleitungen ist noch ein Feld `PIN` sichtbar.

Erwartung:
- PIN-Feld wird nicht mehr angezeigt.
- Firebase Auth ist der Login-Weg.
- Keine alte PIN-Logik für neue Standortleitungen.

Bitte prüfen:
- `app/nutzer.jsx`
- Formularlogik für Standortleitung

---

## Bug 6 – Admin kann keine Standorte anlegen

Ist-Zustand:
- Admin kann aktuell keine Standorte anlegen.

Erwartung:
- Admin kann Standorte anlegen.
- Neue Standorte werden korrekt in der Collection `standorte` gespeichert.
- Keine Auswirkungen auf bestehende Standortlogik.

Bitte prüfen:
- `app/nutzer.jsx`
- mögliche Standortverwaltung
- `utils/db.js`
- Firestore Rules für `standorte`

---

## Bug 7 – Standortleitung kann Schüler nicht nachträglich Standort zuweisen

Ist-Zustand:
- Standortleitung hat keine Möglichkeit, Schüler nachträglich einem Standort zuzuweisen.

Erwartung für Version 1.0:
- Kein großes neues Standortmodell.
- Bestehendes Standortmodell bleibt erhalten.
- Wenn ein Schüler durch Standortleitung bearbeitet wird, muss eine sinnvolle Möglichkeit bestehen, die Standortzuordnung korrekt zu setzen oder zu korrigieren.
- Falls fachlich nur Admin Standorte ändern darf, bitte klar dokumentieren und UI entsprechend absichern.

Bitte prüfen:
- `app/schueler.jsx`
- `app/nutzer.jsx`
- Schüler-Bearbeitungsformular
- `standortId`
- Rollenrechte Standortleitung

---

# P2 – NFC User Experience

## Bug 8 – Zeitraum zwischen NFC-Scan und Start der Zeiterfassung verbessern

Ist-Zustand:
- Zwischen NFC-Scan und sichtbarem Start der Zeiterfassung vergeht spürbar Zeit.
- Für Nutzer wirkt der Ablauf dadurch verzögert oder unklar.

Erwartung:
- Reduziere den Zeitraum zwischen Scan und sichtbarem Start, soweit ohne Architekturumbau möglich.
- Falls technisch nicht spürbar verkürzbar, ergänze eine moderne, futuristische, aber dezente Lade-/Scan-Animation oder einen klaren visuellen Zwischenstatus.
- Nutzer muss sofort erkennen: "NFC wurde erkannt, Vorgang wird verarbeitet."

Grenzen:
- Keine große UI-Neugestaltung.
- Keine neue Featurestrecke.
- Animation dezent und performant.
- NFC-Start darf nicht beschädigt werden.
- NFC-Stop darf nicht beschädigt werden.

Bitte prüfen:
- `utils/nfcService.js`
- `app/scan.jsx`
- Dashboard/NFC-Statusanzeige, falls vorhanden
- Lade-/Status-State im NFC-Workflow

---

# Explizit NICHT Bestandteil dieses Sprints

- Standorte abschaffen
- Rollenmodell ändern
- Auth-Architektur umbauen
- Firebase Auth neu entwickeln
- Neue große Benutzerverwaltung
- UI-Redesign
- Neue Features außerhalb der genannten Bugs

## Product-/Architecture-Entscheidung
Die Frage "Brauchen wir Standorte überhaupt noch oder läuft künftig alles über Standortleitungen?" wird NICHT in diesem Sprint entschieden.

Für Version 1.0 bleiben Standorte Bestandteil des Daten- und Rollenmodells.

Diese Frage wird ins Backlog für Version 1.1 aufgenommen.

---

# Ergebnis

Erstelle:

`Result_F014_Dev.md`

Der Bericht muss enthalten:
- Executive Summary
- Geänderte Dateien
- Ursache je Bug
- Umsetzung je Bug
- Nicht gelöste Punkte
- Risiken
- Tests / nicht durchführbare Tests
- Empfehlung an QA
- Empfehlung an Coordinator

Nach Abschluss committen und pushen.

Übergabe ausschließlich an den 🧭 Coordinator.
