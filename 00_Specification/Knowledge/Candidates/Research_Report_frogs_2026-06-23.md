# Research Report – frogs. Security- und Betriebsnachweise

Status: Knowledge Candidates / Human Review erforderlich  
FDOS Validation Level: Level 0 — Concept  
Confidence: Low  
Research Date: 2026-06-23

## 1. Zweck

Dieser Report dokumentiert neue Projekterkenntnisse aus `frogs-zeiterfassung`, ohne sie als FDOS-Standard zu behandeln.

Er verändert weder FDOS Core noch Governance, Verfassungen, Standards oder Reference Implementations.

## 2. Referenzstände

- FDOS: `Tim180201/fdos-genesis@6daae3e7e75c8a870559e72e1032eb377c69f8b1`
- Projekt: `Tim180201/frogs-zeiterfassung@ef7ecd183dd0c0f3c279ad182caad23ec92434a5`
- Ausgewertete Projektentwicklung: `35fc1d279b734c0ddb11fc3f3eb560d36ce2d0c0..ef7ecd183dd0c0f3c279ad182caad23ec92434a5`

## 3. Quellen

- `ADO/03_Quality/RR-002_Firebase_Rules_Test_Protocol.md`
- `ADO/02_Results/Result_ADMIN-DASHBOARD-PERMISSION-001.md`
- `ADO/02_Results/Result_F017_Dev.md`
- `ADO/00_Core/Project_Status.md`
- `SECURITY_NOTES.md`
- `app/login.jsx`
- `utils/db.js`
- `firestore.rules`

## 4. Beobachtete Fakten

### 4.1 Repository-Stand und Live-Deployment waren verschieden

Das Projekt enthielt rollenbasierte produktive Firestore Rules. Die manuelle Firebase-Console-Prüfung dokumentierte jedoch weiterhin eine live aktive Testmodus-Regel mit Ablaufdatum 2026-06-24.

Am 2026-06-22 wurden die produktiven Rules anschließend manuell veröffentlicht.

Die vollständige Rollenmatrix, Authentifizierung, Provisionierung und Rollback sind weiterhin nicht praktisch nachgewiesen. Das Projektprotokoll bewertet RR-002 deshalb ausdrücklich nur als teilweise belegt.

### 4.2 UI-Session und Backend-Autorisierung waren nicht kohärent

Das Admin-Dashboard konnte eine lokale Admin-Session anzeigen, obwohl keine ausreichend autorisierte Firebase-Anfrage mit aktivem `users/{uid}`-Adminprofil bestand.

Firestore lehnte die Dashboard-Abfragen dadurch mit `permission-denied` ab.

Der dokumentierte Projektfix:

- entfernt lokale Admin-Fallbacksessions ohne Firebase Auth,
- synchronisiert nach erfolgreichem Login das erforderliche Adminprofil,
- öffnet bei Auth- oder Bootstrap-Fehlern kein unauthentifiziertes Dashboard.

Android-Bundle und statische Prüfungen sind dokumentiert. Ein realer Firebase-/Geräte-Smoke-Test steht weiterhin aus.

### 4.3 Sicherheitsstatus besteht aus mehreren getrennten Nachweisen

Im Projekt liegen gleichzeitig unterschiedliche Nachweisarten vor:

- statischer Abgleich von Code und Rules,
- dokumentierter manueller Rules-Publish,
- ausstehende praktische Rollenmatrix,
- ausstehender Admin-Dashboard-Smoke-Test,
- ausstehende Validierung von Provisionierung und Rollback.

Ein einzelnes Urteil wie „bestanden“ beschreibt diese Ebenen nicht vollständig.

### 4.4 Aktive Projektdokumente sind nicht vollständig synchron

Der aktuelle `Project_Status.md` verweist weiterhin auf die geprüfte Codebasis `main@09f2ea76d8f937d7741cf26205c2082f0485d27f`.

Er bezeichnet den Rules-Deploy-Stand noch als unbestätigt, während das RR-002-Protokoll inzwischen einen manuellen Publish dokumentiert.

`SECURITY_NOTES.md` beschreibt weiterhin eine Legacy-Adminsession ohne Firebase Auth. Der aktuelle Login und das Resultat des Admin-Dashboard-Fixes dokumentieren dagegen, dass diese Fallbacksessions entfernt wurden.

Diese Beobachtung verstärkt den vorhandenen Knowledge Candidate [Post-Recovery Truth Reconciliation](https://github.com/Tim180201/fdos-genesis/issues/1).

## 5. Analytische Schlussfolgerungen

### Knowledge Candidate A — Deployment Evidence Chain

Sicherheitskonfiguration im Repository ist kein Nachweis dafür, dass dieselbe Konfiguration in der Zielumgebung aktiv ist.

Ein belastbarer Sicherheitsstatus sollte getrennt und nachvollziehbar erfassen:

1. geprüften Quellcode-Commit,
2. geprüfte Konfigurationsversion,
3. Zielumgebung,
4. tatsächlichen Deployment-Nachweis,
5. ausgeführte Autorisierungs- und Negativtests,
6. Zeitpunkt und verantwortliche Person,
7. weiterhin offene Testbereiche.

### Knowledge Candidate B — Authorization State Coherence

Eine lokale Anwendungsrolle oder gespeicherte UI-Session ist nicht gleichbedeutend mit einer vom Backend autorisierten Identität.

Vor autorisierten Datenzugriffen müssen die beteiligten Zustände kohärent sein:

- Authentifizierungszustand,
- technische Identität,
- aktives Rollenprofil,
- lokale Session,
- serverseitige Autorisierungsregeln.

Fehlerpfade dürfen keine privilegierte lokale Session erzeugen, wenn die serverseitige Identität oder das erforderliche Profil fehlt.

### Knowledge Candidate C — Layered Security Status

Statische Prüfung, Deployment, Laufzeit-Smoke-Test und vollständige Rollenmatrix sind unterschiedliche Evidenzebenen.

Ein positives Ergebnis auf einer Ebene darf nicht automatisch als Erfolg der anderen Ebenen dargestellt werden.

## 6. Risiken

- Repository und Produktivumgebung können unbemerkt verschiedene Sicherheitsregeln verwenden.
- Eine scheinbar gültige UI-Session kann serverseitig vollständig unautorisiert sein.
- Ein allgemeines „Security Review bestanden“ kann noch offene Laufzeit- und Negativtests verdecken.
- Veraltete Status- und Security-Dokumente können falsche Betriebs- oder Freigabeentscheidungen begünstigen.
- Nicht an Commit und Umgebung gebundene Nachweise verlieren bei späteren Änderungen ihre Aussagekraft.

## 7. Grenzen der Erkenntnis

- Evidenz stammt aus einem Projekt.
- Die Admin-Dashboard-Korrektur ist statisch und per Android-Bundle geprüft, aber nicht gegen Firebase auf einem Gerät validiert.
- Die Firestore-Rollenmatrix wurde nicht vollständig ausgeführt.
- Keine organisatorische Review oder Freigabe liegt vor.
- Es erfolgt keine Verallgemeinerung zum FDOS-Standard.

## 8. Unverbindliche Empfehlungen

### Für frogs.

- `Project_Status.md` auf den tatsächlich geprüften Commit und den teilweisen RR-002-Stand aktualisieren.
- `SECURITY_NOTES.md` mit dem entfernten Legacy-Session-Fallback abgleichen.
- Admin-Dashboard-Smoke-Test und vollständige Rules-Rollenmatrix ausführen.
- Jeden Nachweis an Commit, Umgebung, Zeitpunkt und Tester binden.
- Statische, deployte und praktisch validierte Security-Zustände getrennt ausweisen.

### Für Human Governance

- Prüfen, ob die drei Kandidaten als begrenztes Experiment mit Owner und erwarteter Evidenz auf Level 1 gehoben werden sollen.
- Vor einer höheren Einstufung mindestens den dokumentierten Firebase-Smoke-Test und die Rollenmatrix abwarten.
- Vor einer Standardisierung Evidenz aus weiteren Projekten oder unabhängigen Kontexten verlangen.

## 9. Governance-Hinweis

Dieser Report ist ein Research-Artefakt gemäß Research Agent Constitution.

Er ist kein Standard, keine Governance-Entscheidung und keine Änderung organisatorischer Wahrheit.
