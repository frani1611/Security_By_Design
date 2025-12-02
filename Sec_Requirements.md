| Nr. | Bereich / Requirement                                     | Beschreibung / Umsetzung                                                                                                       |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Sichere Authentifizierung & Autorisierung**             | Benutzer müssen sich über sichere Verfahren anmelden. Passwort-Hashing mit Argon2/bcrypt, MFA, RBAC.                           |
| 2   | **Schutz sensibler Daten (Data Encryption)**              | Verschlüsselung im Ruhezustand (AES-256) und bei Übertragung (TLS 1.3). Keine Klartextspeicherung von Tokens oder Passwörtern. |
| 3   | **Schutz vor Web-Sicherheitslücken**                      | Input Validation, Output Encoding, CSRF-Token, sichere Cookies (HttpOnly, Secure, SameSite).                                   |
| 4   | **Logging, Monitoring & Intrusion Detection**             | Zentrales Log-Management, Alerts bei Anomalien, datenschutzkonforme Aufbewahrung.                                              |
| 5   | **API-Security & Zugriffskontrolle zu externen Diensten** | Nutzung von Secrets Vaults, Token-Rotation, Rate Limiting, Input Validation.                                                   |
| 6   | **Sichere Passwörter erzwingen**                          | Mindestlänge, Kombination aus Buchstaben/Zahlen/Sonderzeichen, Validierung auf Client & Server.                                |
| 7   | **Passwörter sicher speichern**                           | Hash mit bcrypt oder Argon2.                                                                                                   |
| 8   | **Automatisches Logout bei Inaktivität**                  | Session-Timeout nach 15–30 Minuten.                                                                                            |


## CI / Pipeline Anforderungen und Repository Secrets

Für die in der Arbeit beschriebene CI/CD-Pipeline (SBOM, SAST, SCA, Secret Scan, Image Build, Image Signing, Quality Gate, Deploy) werden folgende Repository-Secrets in GitHub Actions benötigt:

- `GHCR_TOKEN` (oder `REGISTRY_TOKEN`): Personal Access Token für das Container-Registry-Account (z. B. GitHub Container Registry). Scopes: `write:packages`, `delete:packages` und `repo` wenn das Repository privat ist.
- `KUBECONFIG`: Inhalt der kubeconfig-Datei, damit der Actions-Runner `kubectl apply` im Ziel-Cluster ausführen kann.
- `REGISTRY_USER` / `REGISTRY_TOKEN` (optional): Falls eine andere Registry (z. B. Docker Hub) genutzt wird.
- `COSIGN_PRIVATE_KEY` / `COSIGN_PASSWORD` (optional, nicht empfohlen): Nur nötig, wenn du weiterhin mit lokal generierten Schlüsseln signieren möchtest. Die Pipeline ist standardmäßig auf keyless (OIDC) cosign konfiguriert, siehe unten.

Wichtig: die Workflow-Datei benötigt `id-token: write` Berechtigung (ist bereits in der Beispiel‑Workflow gesetzt), damit GitHub Actions OIDC Tokens ausgeben kann.

### Empfohlener Ablauf / Quickstart

1. Commit & Push der Änderungen (wir haben bereits die Workflow-Datei und `k8s/`-Manifeste angepasst):

```powershell
cd Code/social-media-dashboard
git add .
git commit -m "Add CI pipeline + k8s placeholders"
git push origin main
```

2. Erzeuge ein PAT für GHCR (falls GHCR verwendet wird): GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic).
   - Wähle `write:packages` und `delete:packages` und ggf. `repo`.
   - Lege den Token als Repository Secret `GHCR_TOKEN` an (Settings → Secrets and variables → Actions → New repository secret).

3. Lege `KUBECONFIG` als Repository Secret an: kopiere den Inhalt deiner `~/.kube/config` (oder die von einem ServiceAccount erzeugte Konfig) und füge ihn als Secret hinzu.

4. Erstelle im Cluster das `imagePullSecret` so, dass Deployments Images aus der Registry ziehen können. Beispiel (mit GHCR):

```bash
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=<GITHUB_USERNAME> \
  --docker-password=<GHCR_TOKEN> \
  --docker-email=<EMAIL> \
  -n <namespace>
```

5. (Optional) Wenn du lokale cosign-Keys erzeugt hast und weiterhin private-key signing unterstützen möchtest:

```bash
# cosign installieren
cosign generate-key-pair
# Ergebnis: cosign.key (privat), cosign.pub (öffentlich)
# Kopiere den Inhalt von cosign.key in das GitHub Secret `COSIGN_PRIVATE_KEY` (nur falls nötig)
```

### Keyless (OIDC) Signing — empfohlen

Die Pipeline nutzt standardmäßig keyless cosign signing via GitHub OIDC (keine Speicherung des privaten Schlüssels in Secrets). Voraussetzungen:
- Workflow hat `id-token: write` (in der Beispiel-Workflow gesetzt).
- Die Jobs laufen auf GitHub-hosted runner (default) mit OIDC-Unterstützung.

Beispiele (aus der Pipeline):

```bash
# Signieren keyless
cosign sign --keyless ghcr.io/<owner>/social-media-dashboard:<tag>
# Verifizieren keyless
cosign verify --keyless ghcr.io/<owner>/social-media-dashboard:<tag>
```

Hinweis: Signing nach Digest ist stärker (empfohlen). Dafür muss der Build-Job den Image-Digest ausgeben und das Signier-Job den Digest signieren. Ich kann das Workflow-Update hinzufügen.

### Image-Ersatz in Manifests

Die `k8s/`-Manifeste wurden so angepasst, dass sie `IMAGE_PLACEHOLDER` anstelle eines festen Image-Namens verwenden. Der Workflow ersetzt diese Platzhalter beim Deploy. Alternativ ist `kubectl set image` robuster, z. B.:

```bash
kubectl set image deployment/backend backend=ghcr.io/<owner>/social-media-dashboard:<tag> -n <namespace>
kubectl set image deployment/frontend frontend=ghcr.io/<owner>/social-media-dashboard:<tag> -n <namespace>
```

### Entfernen veralteter Secrets

Da die Pipeline jetzt keyless signing verwendet, kannst du `COSIGN_PRIVATE_KEY` und `COSIGN_PASSWORD` aus den Repository-Secrets entfernen, sofern du nicht einen Fallback für private-key signing benötigst.

### Fehlerbehebung & Logs

- Öffne GitHub → Actions → Workflow run → Job → Step logs für detaillierte Fehlermeldungen.
- Artefakte (SBOM, Trivy, gitleaks) sind in der jeweiligen Jobseite als `Artifacts` verfügbar.

Wenn du möchtest, aktualisiere ich die Pipeline noch, um digest-basiertes Signing hinzuzufügen und `kubectl set image` für das Deploy zu verwenden. Sag mir kurz, ob ich das machen soll.
| Nr. | Bereich / Requirement                                     | Beschreibung / Umsetzung                                                                                                       |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Sichere Authentifizierung & Autorisierung**             | Benutzer müssen sich über sichere Verfahren anmelden. Passwort-Hashing mit Argon2/bcrypt, MFA, RBAC.                           |
| 2   | **Schutz sensibler Daten (Data Encryption)**              | Verschlüsselung im Ruhezustand (AES-256) und bei Übertragung (TLS 1.3). Keine Klartextspeicherung von Tokens oder Passwörtern. |
| 3   | **Schutz vor Web-Sicherheitslücken**                      | Input Validation, Output Encoding, CSRF-Token, sichere Cookies (HttpOnly, Secure, SameSite).                                   |
| 4   | **Logging, Monitoring & Intrusion Detection**             | Zentrales Log-Management, Alerts bei Anomalien, datenschutzkonforme Aufbewahrung.                                              |
| 5   | **API-Security & Zugriffskontrolle zu externen Diensten** | Nutzung von Secrets Vaults, Token-Rotation, Rate Limiting, Input Validation.                                                   |
| 6   | **Sichere Passwörter erzwingen**                          | Mindestlänge, Kombination aus Buchstaben/Zahlen/Sonderzeichen, Validierung auf Client & Server.                                |
| 7   | **Passwörter sicher speichern**                           | Hash mit bcrypt oder Argon2.                                                                                                   |
| 8   | **Automatisches Logout bei Inaktivität**                  | Session-Timeout nach 15–30 Minuten.                                                                                            |
                                                                                    
