# Result F-003 – QA Go-live Quality Assessment

## 1. Executive Summary

Die aktuelle frogs.-App wurde im Rahmen des QA-Sprints F-003 ausschließlich auf Basis der bereitgestellten Dateien geprüft:

- `frogs.Zeiterfassung.zip`
- `ADO_frogs_v1.zip`

Die Prüfung erfolgte als dokumentenbasierte und statische Codeprüfung der aktuellen Anwendung. Ein vollständiger funktionaler Gerätetest konnte innerhalb der ZIP-Prüfung nicht durchgeführt werden. Insbesondere NFC kann ohne echtes Android-Gerät nicht abschließend freigegeben werden.

**QA-Gesamtergebnis:** Die App ist funktional weit fortgeschritten, aber aus QA-Sicht aktuell **nicht go-live-fähig**.

Die wichtigsten Gründe sind:

1. **Firestore Security Rules sind nicht rollenbasiert abgesichert.**
2. **Rollenrechte werden überwiegend im Frontend durchgesetzt und können serverseitig nicht zuverlässig garantiert werden.**
3. **NFC-Start, NFC-Stop und Cold-Start-Verhalten sind laut Projektstatus noch nicht auf echtem Android-Gerät verifiziert.**
4. **Mehrere Go-live-kritische Bereiche sind als „Fix integriert, Test erforderlich“ dokumentiert.**
5. **Es existiert kein automatisierter Test-/Regressionstestlauf im Projekt.**

Damit kann QA derzeit keine Produktionsfreigabe empfehlen.

---

## 2. QA-Gesamtbewertung

### Bewertungsgrundlage

Geprüft wurden insbesondere:

- ADO Case `ADO/01_Cases/ADO_Case_F003_QA.md`
- ADO Project Status
- Architect Summary F-001
- Product Summary F-002
- Projektdateien der aktuellen App
- aktive App-Struktur `app/*`
- aktive Utility-Struktur `utils/*`
- `firestore.rules`
- Projektdokumente `CURRENT_STATUS.md`, `KNOWN_BUGS.md`, `docs/PROJECT_STATUS.md`

### Technischer Prüfstatus

- Statische Parse-Prüfung der JavaScript-/JSX-Dateien in `app/*` und `utils/*`: **bestanden**
- Anzahl geprüfter aktiver JS-/JSX-Dateien: **25**
- Automatisierte Tests: **nicht vorhanden / nicht ausführbar über Projektskripte**
- NFC-Gerätetest: **nicht durchgeführt, zwingend erforderlich**
- Firestore Rules Deploy-/Emulator-Test: **nicht nachgewiesen**

### Gesamturteil

Die Kernfunktionen sind im Code vorhanden, aber mehrere produktionsrelevante Qualitätsrisiken sind offen. Besonders kritisch ist, dass sensible Daten über Firestore Rules nicht rollenbasiert geschützt sind. Für eine digitale Zeiterfassung mit personenbezogenen Daten reicht eine reine Frontend-Rollenprüfung aus QA-Sicht nicht für den Produktivbetrieb.

---

## 3. Geprüfte Bereiche

### 3.1 Login

Geprüfte Dateien:

- `app/login.jsx`
- `utils/auth.js`
- `utils/db.js`
- `app/_layout.jsx`

Bewertung:

- Admin-Login über Admin-PIN ist vorhanden.
- Standortleitung und Lehrer melden sich über Name + PIN aus der Collection `lehrer` an.
- Session wird lokal über AsyncStorage gespeichert.
- Logout/Session-Clearing ist über `clearSession()` vorgesehen.
- Route Guard leitet nicht eingeloggte Nutzer auf `/login`.

Auffälligkeiten:

- Firebase Auth wird nicht verwendet.
- Die lokale Session ist keine serverseitig verifizierbare Authentifizierung.
- Die gewählte Login-Rolle wird bei Lehrer/Standortleitung nicht hart gegen die tatsächliche Rolle validiert. Wird z. B. „Lehrer“ gewählt, aber ein Standortleitungs-Datensatz mit passender PIN gefunden, wird trotzdem die Rolle aus dem Datensatz gespeichert.

QA-Bewertung:

- Funktional grundsätzlich vorhanden.
- Für Produktivbetrieb sicherheitstechnisch nur eingeschränkt belastbar.

---

### 3.2 Rollenrechte

Geprüfte Dateien:

- `utils/permissions.js`
- `app/_layout.jsx`
- `app/index.jsx`
- `app/schueler.jsx`
- `app/stunden.jsx`
- `app/nutzer.jsx`
- `firestore.rules`

Bewertung:

- Frontend-Routen sind rollenabhängig geschützt.
- Navigation wird rollenabhängig aufgebaut.
- Lehrer sehen in `app/schueler.jsx` nur Schüler über `getSchuelerFuerLehrer(session.id)`.
- Standortleitungen filtern Schüler und Lehrer im Frontend nach `standortId`.
- Admin erhält Vollzugriff in der App-Oberfläche.

Kritische Einschränkung:

- Firestore erlaubt in mehreren Collections `allow read: if true` und umfangreiche Schreibrechte ohne echte Authentifizierung.
- Die Rollenlogik ist dadurch nicht serverseitig abgesichert.
- Standort- und Lehrergrenzen beruhen überwiegend auf App-Code, nicht auf belastbaren Datenbankregeln.

QA-Bewertung:

- Frontend-seitig teilweise plausibel umgesetzt.
- Serverseitig nicht ausreichend abgesichert.
- Für Go-live mit echten Kunden-/Mitarbeiterdaten blockierend.

---

### 3.3 Arbeitszeiterfassung

Geprüfte Dateien:

- `app/scan.jsx`
- `utils/db.js`
- `firestore.rules`
- `CURRENT_STATUS.md`
- `KNOWN_BUGS.md`

Bewertung:

- Eigene Arbeitszeit für Admin und Standortleitung ist in `arbeitszeiten` implementiert.
- Start und Stop verwenden `startArbeitszeit()` und `stopArbeitszeit()`.
- Offene Arbeitszeit wird über `getOffeneArbeitszeit(userId)` ermittelt.
- Firestore Rules enthalten inzwischen die Collection `arbeitszeiten`.

Offene Risiken:

- Laut Projektstatus sind Admin-/Standortleitungs-Arbeitszeiten als „Fix integriert, Test erforderlich“ dokumentiert.
- Deploy-/Rules-Test für `arbeitszeiten` ist nicht nachgewiesen.
- Arbeitszeiten sind getrennt von Unterrichtsstunden und werden nach aktuellem Bugstatus möglicherweise nicht vollständig in Export und Stundenübersicht berücksichtigt.

QA-Bewertung:

- Implementierungsstand vorhanden.
- Funktionaler Go-live-Test fehlt.
- Export-/Übersichtsverhalten muss vor Produktivbetrieb fachlich entschieden oder klar dokumentiert werden.

---

### 3.4 Unterricht

Geprüfte Dateien:

- `app/scan.jsx`
- `app/stunden.jsx`
- `utils/db.js`
- `utils/preise.js`

Bewertung:

- Manuelle Schülerstunden sind vorhanden.
- Start ohne Schüler wird verhindert.
- Einzel- und Gruppenstunden werden über `unterrichtsform` abgebildet.
- Mehrere Schüler werden über `schuelerIds` und `schuelerNames` gespeichert.
- Nachträgliche Gruppenumwandlung ist in `app/stunden.jsx` vorhanden.
- Änderungen werden über `aenderungslog` dokumentiert.

Auffälligkeiten:

- Bearbeitung von Zeiten setzt das Datum auf den aktuellen Tag, nicht auf das ursprüngliche Datum des Eintrags. Das kann bei nachträglicher Korrektur älterer Stunden zu falschen Datumswerten führen.
- Die Änderungsnachvollziehbarkeit ist technisch vorhanden, sollte aber fachlich getestet werden: Anzeige, Vollständigkeit, Unveränderlichkeit.

QA-Bewertung:

- Kernfunktion vorhanden.
- Nachbearbeitung benötigt vor Go-live gezielte Regressionstests.

---

### 3.5 Administration

Geprüfte Dateien:

- `app/nutzer.jsx`
- `app/standorte.jsx`
- `app/zuordnung.jsx`
- `utils/db.js`
- `utils/permissions.js`

Bewertung:

- Standortverwaltung für Admin ist vorhanden.
- Nutzerverwaltung für Admin und Standortleitung ist vorhanden.
- Lehrer, Schüler und Standortleitungen werden über die Collection `lehrer` bzw. `schueler` verwaltet.
- Zuordnungen Lehrer ↔ Schüler werden über die Collection `zuordnungen` als Single Source of Truth abgebildet.

Auffälligkeiten:

- Standortleitungen laden im Nutzerbereich zunächst alle Daten und filtern anschließend im Frontend. Dadurch besteht ein Datenschutz-/Rollenrisiko, solange Firestore serverseitig offen ist.
- Root-Duplikate und Altlasten sind im Projekt vorhanden und bleiben ein Risiko für spätere Änderungen.

QA-Bewertung:

- Funktional weitgehend vorhanden.
- Rollen- und Datenisolation nicht ausreichend abgesichert.

---

### 3.6 NFC

Geprüfte Dateien:

- `utils/nfcService.js`
- `utils/nfcAssign.js`
- `utils/nfcErrors.js`
- `app/_layout.jsx`
- `app/scan.jsx`
- `plugins/withNfcIntentFilters.js`
- `KNOWN_BUGS.md`
- `docs/PROJECT_STATUS.md`

Bewertung:

- NFC-Service ist zentral implementiert.
- UID-Normalisierung ist vorhanden.
- Cold-Start-/Background-Tag-Verarbeitung ist vorgesehen.
- Assignment-Scan wird vom globalen Zeiterfassungsworkflow abgegrenzt.
- Lehrer-Zuordnung wird vor Start einer NFC-Stunde geprüft.
- Zweiter Scan soll offene Stunde stoppen.

Offene Risiken:

- NFC-Cold-Start ist laut Projektstatus weiterhin auf echtem Android-Gerät zu verifizieren.
- Foreground-Scan ist auf echtem Android-Gerät zu verifizieren.
- Zweiter Scan derselben Karte muss auf echtem Android-Gerät verifiziert werden.
- NFC ist ein zentraler Go-live-Prozess und kann nicht allein statisch freigegeben werden.

QA-Bewertung:

- Implementierungsstand erkennbar.
- Keine QA-Freigabe ohne echten Gerätetest.

---

## 4. P1 Go-live Blocker

### P1-001: Firestore Security Rules sind nicht rollenbasiert abgesichert

**Bereich:** Security / Rollenrechte / Datenschutz  
**Kritikalität:** Kritisch  
**Status:** Offen

**Beschreibung:**  
Die Firestore Rules erlauben in mehreren Collections Lesezugriffe mit `allow read: if true` sowie weitreichende Schreib-/Löschzugriffe. Die App verwendet keine Firebase Authentication. Rollenrechte werden überwiegend im Frontend umgesetzt.

**Auswirkung:**  
Unberechtigter Zugriff auf personenbezogene Daten und Manipulation zentraler Daten sind nicht ausreichend serverseitig verhindert. Das widerspricht dem Produktziel einer stabilen produktionsreifen Zeiterfassung.

**Erwartetes Verhalten:**  
Rollenrechte müssen auch serverseitig wirksam sein oder vor Go-live muss eine bewusst freigegebene, dokumentierte und akzeptierte Interim-Sicherheitsentscheidung des Coordinators/Kunden vorliegen.

**QA-Empfehlung:**  
Go-live blockieren, bis Security-Entscheidung und Mindestabsicherung verbindlich geklärt sind.

---

### P1-002: NFC nicht auf echtem Android-Gerät verifiziert

**Bereich:** NFC / Zeiterfassung / Unterricht  
**Kritikalität:** Kritisch  
**Status:** Offen

**Beschreibung:**  
Mehrere Projektdateien dokumentieren, dass NFC-Cold-Start, Foreground-Scan und Stop per zweitem Scan noch auf echter Android-Hardware geprüft werden müssen.

**Auswirkung:**  
Der wichtigste tägliche Erfassungsweg kann nicht zuverlässig für den Produktivbetrieb bewertet werden.

**Erwartetes Verhalten:**  
Echter Gerätetest mit mindestens folgenden Szenarien:

- App geschlossen → NFC-Chip scannen → App öffnet → Schüler wird erkannt → Stunde startet
- App aktiv → NFC-Chip scannen → Stunde startet
- Derselbe Chip erneut → offene Stunde wird beendet
- Fremder/nicht zugeordneter Schüler → klare Fehlermeldung, keine Stunde
- Unbekannter Chip → klare Fehlermeldung
- Doppelte NFC-ID → klare Fehlermeldung

**QA-Empfehlung:**  
Go-live blockieren, bis Gerätetest bestanden und dokumentiert ist.

---

### P1-003: Go-live-kritische Fixes sind dokumentiert, aber nicht abschließend getestet

**Bereich:** Regression / Release Readiness  
**Kritikalität:** Hoch  
**Status:** Offen

**Beschreibung:**  
`KNOWN_BUGS.md` und `CURRENT_STATUS.md` enthalten mehrere Einträge mit „Fix integriert, Test erforderlich“.

Betroffen sind unter anderem:

- NFC öffnet App, aber Stunde startet ggf. nicht
- zweiter NFC-Scan stoppt offene Stunde
- Admin/Standortleitung Arbeitszeit
- Firestore Rules für `arbeitszeiten`
- Standortleitung Schüler-Stundenerfassung

**Auswirkung:**  
Die App kann funktional korrekt sein, der Nachweis fehlt jedoch. Ohne Nachweis ist keine QA-Freigabe möglich.

**QA-Empfehlung:**  
Manuellen Regressionstest durchführen und Ergebnisse dokumentieren.

---

### P1-004: Rollenrechte können nur eingeschränkt als durchgesetzt bewertet werden

**Bereich:** Rollenrechte / Datenisolation  
**Kritikalität:** Kritisch  
**Status:** Offen

**Beschreibung:**  
Die Oberfläche filtert Daten rollenabhängig. Durch offene Firestore Rules und Frontend-basierte Filterung ist aber nicht sichergestellt, dass Standortleitungen und Lehrer technisch keinen Zugriff auf fremde Daten haben.

**Auswirkung:**  
Verletzung des zentralen Produktprinzips: „Rollenrechte müssen jederzeit eingehalten werden.“

**QA-Empfehlung:**  
Go-live erst nach Sicherheitsentscheidung oder nach serverseitiger Absicherung.

---

## 5. P2 wichtige Punkte

### P2-001: Export berücksichtigt Arbeitszeiten möglicherweise nicht

**Kritikalität:** Mittel  
**Status:** Offen / fachlich zu klären

Arbeitszeiten liegen in einer getrennten Collection `arbeitszeiten`. Der Export arbeitet primär mit Unterrichtseinträgen. Vor Go-live muss entschieden werden, ob Arbeitszeiten exportiert werden müssen oder bewusst ausgenommen sind.

---

### P2-002: Stundenübersicht zeigt Arbeitszeiten möglicherweise nicht

**Kritikalität:** Mittel  
**Status:** Offen / fachlich zu klären

`app/stunden.jsx` lädt Unterrichtseinträge über `getEintraege()`. Arbeitszeiten aus `arbeitszeiten` werden dort nicht sichtbar integriert. Wenn Admin/Standortleitung ihre Arbeitszeiten kontrollieren sollen, ist eine klare Anzeige oder bewusste Abgrenzung erforderlich.

---

### P2-003: Nachträgliche Zeitbearbeitung setzt Datum auf aktuellen Tag

**Kritikalität:** Mittel  
**Status:** Offen

In `app/stunden.jsx` wird bei manueller Zeitbearbeitung das aktuelle Datum verwendet. Wird eine ältere Stunde korrigiert, kann dadurch das ursprüngliche Datum überschrieben werden.

**Empfehlung:**  
Vor Go-live testen und fachlich bewerten, ob nur Uhrzeiten oder auch Datum bearbeitbar sein sollen.

---

### P2-004: Login-Rollenauswahl ist nicht strikt an die ausgewählte Rolle gebunden

**Kritikalität:** Mittel  
**Status:** Offen

Bei Lehrer-/Standortleitung-Login wird nach Name + PIN gesucht und anschließend die Rolle aus dem Datensatz übernommen. Die vorher ausgewählte Rolle wird nicht strikt validiert.

**Auswirkung:**  
Kann zu verwirrender UX und unerwartetem Login-Kontext führen.

---

### P2-005: Keine automatisierten Regressionstests vorhanden

**Kritikalität:** Mittel  
**Status:** Offen

Im `package.json` sind keine Testskripte definiert. Die QA kann daher keinen automatisierten Regressionstest nachweisen.

**Empfehlung:**  
Für Go-live mindestens eine manuelle Testmatrix dokumentieren; mittelfristig Smoke-/Regressionstests ergänzen.

---

### P2-006: Root-Duplikate / Altlasten erhöhen Wartungsrisiko

**Kritikalität:** Mittel  
**Status:** Bekanntes Risiko

Dokumentierte Root-Duplikate:

- `db.js`
- `nfcService.js`
- `permissions.js`
- `scan.jsx`
- `_layout.jsx`
- `index.jsx`

**Auswirkung:**  
Künftige Änderungen könnten versehentlich in nicht aktiven Dateien erfolgen.

---

## 6. P3 spätere Optimierungen

### P3-001: UI-Konsistenz final prüfen

Nach Stabilisierung der P1-/P2-Themen sollte eine UI-Konsistenzprüfung erfolgen.

### P3-002: Ladezustände und Performance prüfen

Mehrere Bereiche laden komplette Collections und filtern danach lokal. Nach Go-live sollte geprüft werden, ob das bei wachsender Datenmenge performant bleibt.

### P3-003: Komfortfunktionen und Reports

Zusätzliche Reports und Komfortfunktionen sind nicht go-live-kritisch und sollten nach erfolgreicher Stabilisierung geplant werden.

---

## 7. Rollenrechte-Bewertung

### Administrator

**Erwartung:** Vollzugriff auf alle Standorte und Daten.  
**Bewertung:** In der UI grundsätzlich erfüllt.

### Standortleitung

**Erwartung:** Zugriff ausschließlich auf zugewiesene Standorte.  
**Bewertung:** In mehreren Screens frontend-seitig gefiltert. Serverseitig nicht ausreichend abgesichert.

### Lehrer

**Erwartung:** Zugriff ausschließlich auf zugeordnete Schüler.  
**Bewertung:** In der Schülerliste über `getSchuelerFuerLehrer()` plausibel umgesetzt. Bei NFC wird die Zuordnung geprüft. Serverseitig bleibt Zugriff auf Daten durch offene Rules nicht ausreichend begrenzt.

### Gesamtbewertung Rollenrechte

**Nicht freigabefähig für Go-live**, solange Firestore Rules offen bleiben oder keine explizite Risikoakzeptanz vorliegt.

---

## 8. NFC-Bewertung

NFC ist technisch implementiert, aber nicht freigabefähig, solange die reale Hardwareprüfung fehlt.

### Positiv

- Zentrale NFC-Service-Datei vorhanden.
- NFC-UID-Normalisierung vorhanden.
- Fehlercodes vorhanden.
- Assignment-Scan wird vom Zeiterfassungsworkflow getrennt.
- Lehrer-Schüler-Zuordnung wird geprüft.
- Offene Stunde kann über NFC erkannt und beendet werden.

### Offen

- Cold Start auf echtem Android-Gerät
- Foreground Scan auf echtem Android-Gerät
- Stop per zweitem Scan
- unbekannter Chip
- doppelte NFC-ID
- fremder Schüler
- Verhalten bei Netzwerkproblemen
- Verhalten bei App-Wechsel / Hintergrund / gesperrtem Gerät

### NFC-Freigabestatus

**Nicht freigegeben.**

---

## 9. Testempfehlungen

Vor einer erneuten QA-Prüfung sollten mindestens folgende Tests dokumentiert durchgeführt werden.

### 9.1 Login und Session

1. Admin mit korrektem PIN einloggen.
2. Admin mit falschem PIN abweisen.
3. Standortleitung mit korrektem Name/PIN einloggen.
4. Lehrer mit korrektem Name/PIN einloggen.
5. Falscher Name/PIN wird abgewiesen.
6. App schließen und öffnen: Session bleibt korrekt.
7. Logout löscht Session und schützt App-Routen.

### 9.2 Rollenrechte

1. Admin sieht alle Standorte, Lehrer, Schüler, Stunden.
2. Standortleitung sieht nur eigenen Standort.
3. Standortleitung sieht keine fremden Schüler/Stunden.
4. Lehrer sieht nur zugeordnete Schüler.
5. Lehrer kann keine Admin-Routen öffnen.
6. Direkte Navigation auf geschützte Route wird abgefangen.

### 9.3 Arbeitszeit

1. Admin startet eigene Arbeitszeit.
2. Admin stoppt eigene Arbeitszeit.
3. Standortleitung startet eigene Arbeitszeit.
4. Standortleitung stoppt eigene Arbeitszeit.
5. Doppelte Starts werden verhindert.
6. Stop ohne offene Arbeitszeit wird abgefangen.
7. Speicherung in Firestore prüfen.

### 9.4 Unterricht manuell

1. Lehrer startet Einzelstunde mit zugeordnetem Schüler.
2. Lehrer beendet Einzelstunde.
3. Standortleitung startet Schülerstunde.
4. Start ohne Schüler wird verhindert.
5. Gruppenstunde mit mehreren Schülern starten.
6. Stunde nachbearbeiten.
7. Änderungslog anzeigen und prüfen.

### 9.5 NFC Android-Gerätetest

1. App geschlossen, Chip scannen.
2. App im Vordergrund, Chip scannen.
3. Zweiter Scan stoppt Stunde.
4. Fremder Schüler wird abgewiesen.
5. Unbekannter Chip wird abgewiesen.
6. Doppelte NFC-ID wird abgewiesen.
7. Scan während NFC-Zuweisung löst keine Stunde aus.
8. Netzwerkfehler erzeugt verständliche Fehlermeldung.

### 9.6 Export / Übersicht

1. Unterrichtseinträge exportieren.
2. Statuswechsel nach Export prüfen.
3. Entscheiden/testen, ob Arbeitszeiten exportiert werden müssen.
4. Entscheiden/testen, ob Arbeitszeiten in Stundenübersicht sichtbar sein müssen.

---

## 10. Go-live Empfehlung

### Empfehlung

**Nachbesserung erforderlich. Keine Go-live-Freigabe.**

### Begründung

Die App ist funktional weit fortgeschritten, aber die Go-live-kritischen Risiken sind noch nicht ausreichend geschlossen. Besonders Firestore Security, rollenbasierte Datenisolation und NFC-Geräteverifikation verhindern eine belastbare Produktionsfreigabe.

### Mindestbedingungen für erneute QA-Prüfung

1. Entscheidung zur Firestore-Sicherheitsstrategie dokumentieren.
2. Rollenrechte serverseitig absichern oder Risiko explizit durch Coordinator/Kunde akzeptieren lassen.
3. NFC-Test auf echtem Android-Gerät durchführen und dokumentieren.
4. Arbeitszeit-Start/-Stop für Admin und Standortleitung manuell nachweisen.
5. Unterrichtsstart/-stop manuell und per NFC nachweisen.
6. Standortleitungs- und Lehrer-Datenisolation testen.
7. Export-/Übersichtsentscheidung zu Arbeitszeiten treffen.

---

## 11. Empfehlung an den Coordinator

Der Sprint F-003 ist abgeschlossen.

QA empfiehlt dem 🧭 Coordinator:

1. **Keinen Go-live auf Basis des aktuellen Stands freigeben.**
2. Einen kurzfristigen Stabilisierungssprint für P1-Themen ansetzen.
3. Firestore Security als zentrale Go-live-Entscheidung behandeln.
4. NFC-Gerätetest als Pflichtabnahme vor Release definieren.
5. Nach Abschluss der P1-Themen eine erneute QA-Prüfung beauftragen.

## Freigabestatus

**Nicht freigegeben.**

Die App kann aus QA-Sicht erst nach Nachbesserung und erneuter Prüfung für den Produktivbetrieb empfohlen werden.
