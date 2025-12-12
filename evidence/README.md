# Evidence Directory

This directory contains security scan reports and artifacts from CI/CD pipeline runs.

## Structure

Each pipeline run creates subdirectories organized by Run ID:

```
evidence/
├── run/          # Pipeline run metadata and logs
├── sast/         # Static Application Security Testing (CodeQL)
├── sbom/         # Software Bill of Materials (Syft)
├── sca/          # Software Composition Analysis (Trivy)
├── secrets/      # Secret scanning (gitleaks)
└── signing/      # Image signing and verification (Cosign)
```

## File Naming Convention

All files are prefixed with the GitHub Actions Run ID for traceability:
- `{report-type}-{run_id}.{extension}`
- Example: `trivy-fs-1234567890.json`

## Retention

Files are committed to the repository by the CI/CD pipeline and retained indefinitely unless manually cleaned up.

## Access

All evidence files are part of the Git repository history and can be accessed via:
- Git history: `git log -- evidence/`
- GitHub UI: Browse the evidence/ directory
- Pipeline artifacts: GitHub Actions → Workflow Run → Artifacts
