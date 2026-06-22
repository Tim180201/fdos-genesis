# Architecture Decisions Index

## Verbindliche Entscheidungen
- Firebase Auth ist technische Identitätsschicht.
- `users/{uid}` ist Quelle für Rolle, Aktivstatus und Standortbezug.
- Bestehende Fachcollections bleiben erhalten.
- Für v1.0 bleibt das Standortmodell bestehen.
- Keine Custom Claims in der Minimalmigration, außer später explizit entschieden.

## Offene Architekturfragen
- Sichere automatische Auth-User-Anlage aus der App: Client-SDK vs. Cloud Function/Backend.
- Standortmodell für v1.1.
