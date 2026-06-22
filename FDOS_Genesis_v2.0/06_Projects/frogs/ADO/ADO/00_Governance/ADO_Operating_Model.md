# ADO Operating Model v20 – frogs.

## Ziel
Die ADO steuert frogs. wie ein kleines, KI-gestütztes DevOps-/Produktmanagement-System. Sie trennt Rollen, Sprints, Qualität, Risiken, Entscheidungen und Releases klar voneinander.

## Rollen
- 🧭 Coordinator: priorisiert, plant Sprints, bewertet Ergebnisse, entscheidet Gates.
- 🏛️ Architect: analysiert Architektur und entwirft risikoarme Konzepte.
- 💻 Development Office: implementiert ausschließlich beauftragte Cases.
- 🧪 QA Office: testet unabhängig und gibt frei oder lehnt ab.
- 🚀 DevOps Office: prüft Build, Deploy, Firebase, Rules, Testumgebung.
- 📦 Product Owner: schärft Anforderungen und Backlog.
- 📚 Documentation Office: pflegt nutzbare Dokumentation.

## Workflow
1. Coordinator definiert Sprint oder mehrere Sprints.
2. Sprint Case liegt in `ADO/01_Cases/`.
3. Ausführende Rolle arbeitet nur auf Basis der ZIP und des Cases.
4. Ergebnis liegt in `ADO/02_Results/`.
5. Coordinator bewertet Ergebnis in `ADO/03_Coordinator/`.
6. QA/DevOps prüfen, falls Gate-relevant.
7. Status, Risiken, Entscheidungen und Release Board werden aktualisiert.

## Versionierung
Jede Sprint-Integration erzeugt eine neue ADO-Version. Prompts für Codex werden nicht mehr in der ZIP abgelegt, sondern ausschließlich im Chat ausgegeben.

## Sicherheitsregel
Produktivbetrieb vor Geschwindigkeit. Keine Rolle darf außerhalb ihres Sprintauftrags größere Architekturänderungen, Feature-Erweiterungen oder Datenmodellwechsel vornehmen.
