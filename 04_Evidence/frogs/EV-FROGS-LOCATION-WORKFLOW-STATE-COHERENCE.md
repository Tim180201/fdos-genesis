# Evidence Record — frogs Location Workflow and State Coherence

Status: Evidence Item / Human Review erforderlich  
Project: frogs. Zeiterfassung  
Date: 2026-06-23  
Confidence: Low  
FDOS Validation Level: Level 0 — Concept  
Core Impact: None

## 1. Referenzstände

- FDOS: `Tim180201/fdos-genesis@173a25ce59824e3a3d6ef69dacc7b3f895807e3d`
- Projekt: `Tim180201/frogs-zeiterfassung@4eac9209a2c5bddd2fe0f9e061c8c71e20351617`
- Ausgewertete Projektentwicklung: `e6e20542ee3c315749a0ce9dc270946e77b7201a..4eac9209a2c5bddd2fe0f9e061c8c71e20351617`

## 2. Quellen

- `ADO/01_Sprints/SPRINT_RC-BUGFIX-ADMIN-LOCATION-CREATE-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-ADMIN-LOCATION-CREATE-001.md`
- `ADO/00_Core/Project_Status.md`
- `ADO/00_Core/Risk_Register.md`
- `app/nutzer.jsx`
- `utils/db.js`
- `utils/userProvisioning.js`
- `firestore.rules`

## 3. Beobachtete Fakten

### 3.1 Vollständiger Speicherpfad war über die Oberfläche nicht erreichbar

Der Projektcode enthielt bereits:

- Formularinitialisierung für `standorte`,
- den Helper `addStandort`,
- Speicherung in der Collection `standorte`,
- Listen-Reload nach dem Speichern,
- eine bestehende Admin-Regel für das Anlegen gültiger Standorte.

Im Standort-Tab waren jedoch sowohl Plus-Button als auch Empty-State-Aktion ausgeblendet. Der vorhandene Ablauf konnte dadurch nicht gestartet werden.

Der minimale Fix macht die bestehenden Einstiege sichtbar und verwendet weiterhin denselben Save-/Reload-Pfad.

### 3.2 UI und Provisionierungsintegration verwiesen auf unterschiedliche Schnittstellen

`app/nutzer.jsx` importierte und verwendete `provisionLehrer` und `provisionStandortleitung` aus `utils/db.js`, obwohl diese Exports dort nicht vorhanden waren.

Der tatsächliche vorhandene Provisionierungsweg lag in `utils/userProvisioning.js` als `provisionManagedUser`.

Der Fix verdrahtet Lehrer- und Standortleitungsanlage mit diesem bestehenden Helper. Rollenmodell, Firebase-Konfiguration und Firestore Rules wurden nicht erweitert.

### 3.3 Fach- und Autorisierungsprofil konnten unterschiedliche Standortzustände tragen

Beim Bearbeiten einer Standortleitung wurde die Standortzuordnung nur im `lehrer`-Dokument aktualisiert.

Session und Firestore Rules leiten den Standort jedoch aus dem zugehörigen `users/{uid}`-Profil ab. Das Profil konnte deshalb die vorherige Standortzuordnung behalten.

Der Fix aktualisiert bei vorhandener Profil-ID zusätzlich Name, `standortId` und `standortName` über den bestehenden Helper `updateUserProfile`.

Legacy-Datensätze ohne Profil-ID bleiben im bestehenden Fachpfad bearbeitbar.

### 3.4 Validierungsstatus bleibt begrenzt

Dokumentiert bestanden:

- statische Prüfung der Standort-Neuanlage,
- statische Prüfung der Standortleitungs-Neuanlage und -Bearbeitung,
- Berechtigungsprüfung ohne Rules-Änderung,
- `git diff --check`,
- `npm ci --loglevel=error`,
- Android-/Expo-Export mit 1.113 Modulen.

Nicht dokumentiert bestanden:

- Standortanlage in der APK,
- Reload und anschließende Standortauswahl,
- Provisionierung gegen Firebase,
- Neuanmeldung nach Standortwechsel,
- Zugriff gegen deployte Rules,
- Rollback bei partiellem Provisionierungsfehler.

Der RC bleibt blockiert.

## 4. Analytische Schlussfolgerungen

### Knowledge Candidate A — End-to-End Workflow Reachability

Ein vorhandener Backend-, Persistenz- oder Berechtigungspfad stellt noch keine nutzbare Capability dar.

Ein fachlicher Workflow ist erst erreichbar, wenn die vollständige Kette konsistent verbunden ist:

```text
UI Entry
→ Form State
→ Validation
→ Integration Helper
→ Persistence
→ Reload / Feedback
→ Authorization Context
```

Fehlt ein Einstieg oder verweist eine Stufe auf eine nicht vorhandene Schnittstelle, bleibt die vorhandene Implementierung praktisch unbenutzbar.

Diese Beobachtung verstärkt den Evidence Record `EV-FROGS-RC-MINIMAL-WORKFLOW-RESTORATION.md`.

### Knowledge Candidate B — Mirrored Authorization State Coherence

Wenn derselbe Autorisierungskontext in Fach- und Identitätsprofilen gespeichert wird, können partielle Aktualisierungen widersprüchliche Zustände erzeugen.

Für dieses Projekt betrifft das:

- fachliche Standortzuordnung im `lehrer`-Dokument,
- wirksame Standortzuordnung im `users/{uid}`-Profil,
- Session- und Rules-Auswertung auf Basis des Userprofils.

Änderungen müssen alle für Autorisierung relevanten Repräsentationen berücksichtigen oder eine eindeutig kanonische Quelle verwenden.

Diese Beobachtung verstärkt den bestehenden Knowledge Candidate `Authorization State Coherence`.

### Knowledge Candidate C — Integration Contract Verification

Die Existenz ähnlich benannter Helper ersetzt keine Prüfung des tatsächlichen Import-/Export-Vertrags.

Statische Workflowanalyse sollte mindestens bestätigen:

- exportierte Funktion existiert am importierten Pfad,
- Parametervertrag stimmt überein,
- Rückgabe- und Fehlerpfad werden vom Aufrufer korrekt behandelt,
- der produktiv verwendete Helper ist eindeutig.

Eine organisatorische Standardisierung ist aus der Einzelbeobachtung nicht zulässig.

## 5. Risiken und Grenzen

- Evidenz stammt aus einem Projekt.
- Laufzeit- und Firebase-Validierung fehlen.
- Die Synchronisierung von Fach- und Userprofil erfolgt über getrennte Operationen; Verhalten bei partiellem Fehler ist nicht praktisch validiert.
- Legacy-Einträge ohne Profil-ID besitzen weiterhin einen abweichenden Pfad.
- Der aktuelle Project Status nennt noch einen Sprint-Branch zusätzlich zum inzwischen erfolgten Merge; die Main-Referenz sollte nachgezogen werden.
- Keine organisatorische Review liegt vor.

## 6. Unverbindliche Empfehlungen

### Für frogs.

- Die dokumentierten APK- und Firebase-Smoke-Tests ausführen.
- Standortwechsel nach Neuanmeldung gegen deployte Rules prüfen.
- Partiellen Fehler zwischen Fach- und Userprofil-Aktualisierung gezielt testen.
- Project Status auf den gemergten Main-Commit aktualisieren.
- Legacy-Einträge ohne Profil-ID separat inventarisieren; keine automatische Migration annehmen.

### Für Human Governance

- Kandidaten auf Level 0 belassen.
- Erst nach praktischer Validierung und Review über Level 1 entscheiden.
- Vor einer Standardisierung vergleichbare Evidenz aus weiteren Projekten verlangen.

## 7. Governance-Hinweis

Dieser Evidence Record ist ein Research-Artefakt gemäß Research Agent Constitution.

Er ist kein FDOS-Standard, keine Governance-Entscheidung und keine Release-Freigabe.
