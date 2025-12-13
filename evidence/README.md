# Evidence Verzeichnis

Dieses Verzeichnis enthält Sicherheits-Scan-Berichte und Artefakte aus CI/CD-Pipeline-Durchläufen.

## Struktur

Jeder Pipeline-Durchlauf erstellt nach Run ID organisierte Unterverzeichnisse:

```
evidence/
├── run/          # Pipeline-Durchlauf-Metadaten und Logs
├── sast/         # Static Application Security Testing (CodeQL)
├── sbom/         # Software Bill of Materials (Syft)
├── sca/          # Software Composition Analysis (Trivy)
├── secrets/      # Secret-Scanning (gitleaks)
└── signing/      # Image-Signierung und -Verifizierung (Cosign)
```

## Dateibenennungskonvention

Alle Dateien sind zur Nachverfolgbarkeit mit der GitHub Actions Run ID präfixiert:
- `{report-typ}-{run_id}.{erweiterung}`
- Beispiel: `trivy-fs-1234567890.json`

## Aufbewahrung

Dateien werden von der CI/CD-Pipeline ins Repository committed und unbegrenzt aufbewahrt, sofern sie nicht manuell bereinigt werden.

## Zugriff

Alle Evidence-Dateien sind Teil der Git-Repository-Historie und können abgerufen werden über:
- Git-Historie: `git log -- evidence/`
- GitHub UI: Durchsuchen des evidence/ Verzeichnisses
- Pipeline-Artefakte: GitHub Actions → Workflow Run → Artifacts
