# Evidence Record — frogs RC Minimal Workflow Restoration

Status: Evidence Item / Human Review erforderlich  
Project: frogs. Zeiterfassung  
Date: 2026-06-23  
Confidence: Low  
FDOS Validation Level: Level 0 — Concept  
Core Impact: None

## 1. Referenzstände

- FDOS: `Tim180201/fdos-genesis@90bb751fa47a58c9fa4b60fb764621f02acaccef`
- Projekt: `Tim180201/frogs-zeiterfassung@e6e20542ee3c315749a0ce9dc270946e77b7201a`
- Ausgewertete Projektentwicklung: `ef7ecd183dd0c0f3c279ad182caad23ec92434a5..e6e20542ee3c315749a0ce9dc270946e77b7201a`

## 2. Quellen

- `ADO/01_Sprints/SPRINT_RC-BUGFIX-ASSIGNMENTS-ADMINHOURS-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-ASSIGNMENTS-ADMINHOURS-001.md`
- `ADO/00_Core/Project_Status.md`
- `ADO/00_Core/Risk_Register.md`
- `app/nutzer.jsx`
- `app/stunden.jsx`
- `utils/db.js`

## 3. Kontext

Während des Feature Freeze wurden drei bereits vorgesehene, aber nicht nutzbare Projektabläufe korrigiert:

1. Lehrer-/Schüler-Zuordnungsdialog war auf Android nicht sichtbar.
2. Bereits erfasste Admin- und Standortleitungs-Arbeitszeiten fehlten in der bestehenden Stundenübersicht.
3. Die Lehrer-Neuanlage verlangte einen Standort, bot dem Admin aber keine Standortauswahl an.

Fach-Pflichtfeld, Fachsuche, Datenmigration, Versionsänderung, Firebase-Konfiguration und größere Refactorings blieben ausdrücklich außerhalb des Sprints.

## 4. Beobachtete Fakten

### 4.1 Bestehender Workflow war durch UI-Zustandskonflikt unerreichbar

Der Zuordnungsworkflow, seine Vorauswahl und seine Firestore-Schreibpfade waren bereits vorhanden.

Das Bearbeiten-Modal blieb jedoch geöffnet, während ein zweites natives Zuordnungs-Modal geöffnet wurde. Der minimale Fix stellt sicher, dass jeweils nur eines dieser Modals sichtbar ist und der Bearbeiten-Dialog nach Abschluss wieder geöffnet wird.

Die bestehende Collection `zuordnungen` und ihre Helper wurden nicht ersetzt.

### 4.2 Getrennte Domänendaten wurden erst in der Anzeige zusammengeführt

Unterrichtsstunden und Arbeitszeiten verbleiben in getrennten Collections und behalten unterschiedliche Semantik.

Die Stundenübersicht lädt nun rollenabhängig beide Datenarten und erzeugt ausschließlich für die Anzeige eine gemeinsame chronologische Projektion.

Arbeitszeiten sind als eigener Eintragstyp erkennbar. Unterrichtsstatus, Einheiten und Unterrichtsaktionen werden nicht auf Arbeitszeiten angewendet.

Es erfolgte keine Datenmigration und keine Änderung der Firestore Rules.

### 4.3 Validierung verlangte eine nicht erreichbare Eingabe

Die Lehrer-Neuanlage verlangte für Admins einen Standortwert, zeigte die bereits vorhandene Standortauswahl aber nur im Standortleitungsformular.

Der Fix macht die vorhandene Auswahl auch bei der Lehrer-Neuanlage sichtbar. Standortleitungen bleiben an `session.standortId` gebunden.

Eine widersprüchliche Fach-Pflichtprüfung wurde entfernt, weil das bestehende Formular das Fach als optional beschreibt und der Sprint ein neues Fach-Pflichtfeld ausdrücklich ausschließt.

### 4.4 Implementierungs- und Laufzeitstatus wurden getrennt

Dokumentiert bestanden:

- statische Pfadprüfung,
- `git diff --check`,
- `npm ci`,
- Android-/Expo-Export mit 1.112 Modulen.

Nicht dokumentiert bestanden:

- sichtbares Modalverhalten auf realer Android-Hardware,
- Zuordnung gegen deployte Firestore Rules,
- reale Arbeitszeitanzeige,
- erfolgreiche Lehrer-Provisionierung mit Standortauswahl.

Sprint und Project Status verwenden deshalb weiterhin `Implementiert / APK-Validierung ausstehend`. Der RC bleibt blockiert.

## 5. Analytische Schlussfolgerungen

### Knowledge Candidate A — Bug versus Feature under Freeze

Eine Änderung kann während Feature Freeze als Bugfix gelten, wenn sie ausschließlich einen bereits vorgesehenen und fachlich erforderlichen Ablauf wieder erreichbar macht.

Indikatoren aus diesem Projekt:

- bestehender Workflow oder Datenpfad ist vorhanden,
- ein UI-, Validierungs- oder Darstellungsfehler verhindert die Nutzung,
- der Fix führt keine neue fachliche Fähigkeit ein,
- bestehende Datenmodelle, Rechte und Navigation werden wiederverwendet,
- ausdrücklich benannte Erweiterungen bleiben außerhalb des Scopes.

### Knowledge Candidate B — Required Input Reachability

Wenn eine Validierung eine Eingabe zwingend verlangt, muss der berechtigte Nutzer diese Eingabe im selben Workflow sichtbar und bedienbar setzen können.

Validierungsregel, Rollenberechtigung und Formular-Rendering bilden einen gemeinsamen Nutzbarkeitsvertrag. Eine isolierte Prüfung nur der Validierungslogik reicht nicht aus.

### Knowledge Candidate C — Presentation Composition without Domain Merge

Getrennte fachliche Datenarten können in einer gemeinsamen Übersicht dargestellt werden, ohne ihre Persistenz oder Semantik zu vermischen.

Die Zusammenführung an der Darstellungsgrenze kann eine kleinere und reversiblere Änderung sein als Datenmigration oder Schemafusion, sofern:

- Eintragstypen explizit gekennzeichnet bleiben,
- typfremde Aktionen und Berechnungen ausgeschlossen werden,
- Rollenfilter erhalten bleiben,
- Laufzeit- und Performancewirkung geprüft werden.

### Project Observation — Native Modal Exclusivity

Bei nativen Android-Modals kann ein zweites Modal hinter einem bereits sichtbaren Modal praktisch unerreichbar bleiben.

Für dieses Projekt wurde der Übergang durch sequenzielles Schließen und Öffnen wiederhergestellt. Eine organisatorische Verallgemeinerung ist aus dieser Einzelbeobachtung nicht zulässig.

## 6. Risiken und Grenzen

- Sämtliche Kandidaten stammen aus einem Projekt.
- Die betroffenen Abläufe sind noch nicht per APK-/Firebase-Laufzeittest bestätigt.
- Die gemeinsame Stundenanzeige kann erst nach realen Daten- und Rollenprüfungen als praktisch validiert gelten.
- Zeitbasierte Modalübergänge wurden statisch geprüft, nicht auf mehreren Geräten reproduziert.
- `Project_Status.md` beschreibt noch den Sprint-Branch zusätzlich zum inzwischen erfolgten Merge; die tatsächliche Main-Referenz sollte bei der nächsten Projektpflege nachgezogen werden.
- Es liegt keine organisatorische Review vor.

## 7. Unverbindliche Empfehlungen

### Für frogs.

- Die im Result-Dokument aufgeführten APK-/Firebase-Smoke-Tests ausführen.
- Project Status auf den tatsächlich gemergten `main`-Commit beziehen.
- Bei realen Arbeitszeitdaten Rollenfilter, Sortierung, Kennzeichnung und ausgeschlossene Unterrichtsaktionen prüfen.
- Fach-Pflichtfeld und Fachsuche weiterhin separat als Erweiterungen behandeln.

### Für Human Governance

- Kandidaten zunächst auf Level 0 belassen.
- Level 1 nur mit benanntem Owner, begrenztem Erprobungsumfang und erwarteter Evidenz erwägen.
- Vor einer Standardisierung Evidenz aus weiteren Projekten oder unabhängigen UI-/Datenkontexten verlangen.

## 8. Governance-Hinweis

Dieser Evidence Record ist ein Research-Artefakt gemäß Research Agent Constitution.

Er ist kein FDOS-Standard, keine Governance-Entscheidung und keine Release-Freigabe.
