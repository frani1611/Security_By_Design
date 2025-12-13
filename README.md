

#  Projektübersicht: Social Media Dashboard

##  Thema
**Social Media Dashboard**

##  Beschreibung
Ziel ist die **Erstellung eines Social Media Dashboards** mit integrierter **Bilder-Upload-Funktion** und **Account-Verwaltung**.  
Das Dashboard soll es Benutzern ermöglichen, Inhalte (Bilder) sicher hochzuladen, zu verwalten.

---

##  Hauptfunktionen

### 1.  Bilder-Upload
- Upload von Bildern über das Dashboard (Drag & Drop oder Dateiauswahl)
- Automatische Komprimierung und Formatprüfung (z. B. JPG, PNG, WebP)
- Speicherung in **Cloudinary**

### 2.  Account-Erstellung & Verwaltung
- Registrierung mit E-Mail und sicherem Passwort (Passwort-Hashing)
- Login über sicheres Authentifizierungsverfahren 
- Multi-Faktor-Authentifizierung (Google SSO)

---

##  Sicherheitsanforderungen (Kurzüberblick)

| Nr. | Requirement | Beschreibung / Maßnahme |
|-----|--------------|--------------------------|
| 1 | Sichere Authentifizierung | OAuth 2.0 |
| 2 | Verschlüsselung sensibler Daten | TLS 1.3 |
| 3 | Schutz vor Web-Sicherheitslücken | Input Validation, CSRF-Token |
| 4 | Logging & Monitoring | Zentrales Log-System, Alerts bei Anomalien |
| 5 | API-Sicherheit | Secrets Vaults, Token-Rotation, Rate Limiting |
| 6 | Sichere Passwörter | Mindestlänge, Komplexität, Hashing |
| 7 | Automatisches Logout | Session-Timeout nach Inaktivität |

---

##  Systemarchitektur

###  Frontend
- **Framework:** Vue.js  
- **Beschreibung:**  
  Benutzeroberfläche für Uploads, Dashboard-Ansichten und Account-Verwaltung.  
  Kommunikation mit dem Backend über REST-APIs (Axios oder Fetch).  

###  Backend
- **Technologie:** Node.js (Express)  
- **Beschreibung:**  
  API-Server für Authentifizierung, Upload-Verarbeitung, Datenmanagement und Sicherheit.  
  Verbindung zur Datenbank und Integration mit Cloudinary für Bildspeicherung.  

###  Datenbank
- **Datenbank:** MongoDB  
- **Beschreibung:**  
  Speicherung von Benutzerdaten, Upload-Metadaten und Sitzungsinformationen.  

###  Speicher
- **Dienst:** Cloudinary  
- **Beschreibung:**  
  Cloud-basierte Bildspeicherung mit automatischer Skalierung, CDN und Optimierung.  

###  Containerisierung & Deployment
- **Container:** Docker  
- **Orchestrierung:** Kubernetes  
- **Beschreibung:**  
  Skalierbares Deployment von Frontend, Backend und Datenbank über Container.  

###  CI/CD-Pipeline
- **Tool:** GitHub Actions  
- **Beschreibung:**  
  Automatisiertes Build-, Test- und Push-Setup für kontinuierliche Integration und Auslieferung.  
---

## TLS/HTTPS Konfiguration

Die Anwendung ist **TLS-ready** mit selbstsigniertem Zertifikat:

| Komponente | TLS-Status | Zertifikat |
|-----------|-----------|-----------|
| Backend | ✅ HTTPS | `certs/server.crt` + `certs/server.key` |
| Docker | ✅ HTTPS | Auto-generiert beim Build |
| Kubernetes | ✅ HTTPS | cert-manager ready (Let's Encrypt) |

**Zertifikat-Details:**
- Gültig für 365 Tage
- CN: localhost
- RSA 2048-Bit
- Selbstsigniert (Entwicklung/Testing)

**Für Production:** Verwende echte Zertifikate (Let's Encrypt, CA-signiert)

---

## Detaillierte Sicherheitsanforderungen

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

---

## CI/CD Pipeline & Repository Secrets

Für die CI/CD-Pipeline (SBOM, SAST, SCA, Secret Scan, Image Build, Image Signing, Quality Gate) werden folgende Repository-Secrets in GitHub Actions benötigt:

- `GHCR_TOKEN` (oder `REGISTRY_TOKEN`): Personal Access Token für das Container-Registry-Account (z. B. GitHub Container Registry). Scopes: `write:packages`, `delete:packages` und `repo` wenn das Repository privat ist.
- `KUBECONFIG`: Inhalt der kubeconfig-Datei, damit der Actions-Runner `kubectl apply` im Ziel-Cluster ausführen kann.
- `REGISTRY_USER` / `REGISTRY_TOKEN` (optional): Falls eine andere Registry (z. B. Docker Hub) genutzt wird.
- `COSIGN_PRIVATE_KEY` / `COSIGN_PASSWORD` (optional, nicht empfohlen): Nur nötig, wenn du weiterhin mit lokal generierten Schlüsseln signieren möchtest. Die Pipeline ist standardmäßig auf keyless (OIDC) cosign konfiguriert.

**Wichtig:** Die Workflow-Datei benötigt `id-token: write` Berechtigung (ist bereits in der Workflow-Datei gesetzt), damit GitHub Actions OIDC Tokens ausgeben kann.

### Keyless (OIDC) Signing — empfohlen

Die Pipeline nutzt standardmäßig keyless cosign signing via GitHub OIDC (keine Speicherung des privaten Schlüssels in Secrets). Voraussetzungen:
- Workflow hat `id-token: write` (in der Workflow-Datei gesetzt).
- Die Jobs laufen auf GitHub-hosted runner (default) mit OIDC-Unterstützung.

Beispiele:

```bash
# Signieren keyless
cosign sign --keyless ghcr.io/<owner>/social-media-dashboard:<tag>
# Verifizieren keyless
cosign verify --keyless ghcr.io/<owner>/social-media-dashboard:<tag>
```

**Hinweis:** Signing nach Digest ist stärker (empfohlen). Der Build-Job gibt den Image-Digest aus und das Signing-Job signiert den Digest.

---

## Projekt starten

### Voraussetzungen

- **k3d** oder anderer Kubernetes-Cluster
- **Docker**
- **kubectl**
- **make**
- `.env` Datei in `Code/social-media-dashboard/backend/` mit allen erforderlichen Secrets (siehe `.env.example`)

### Schnellstart mit Makefile

1. **In das Projekt-Verzeichnis wechseln:**
   ```bash
   cd Code/social-media-dashboard
   ```

2. **Secrets und Cluster vorbereiten:**
   ```bash
   # Alle Secrets aus backend/.env erstellen und k3d-Cluster starten
   make k3d-up OWNER=frani1611 TAG=latest
   ```

   Dieser Befehl:
   - Pullt Images von GHCR
   - Erstellt k3d-Cluster (falls nicht vorhanden)
   - Erstellt alle Kubernetes Secrets aus der `.env` (MongoDB, Cloudinary, JWT, Google OAuth)
   - Importiert Images in k3d
   - Deployed alle Manifeste
   - Wartet auf Rollout

3. **Services per Port-Forwarding erreichbar machen:**
   ```bash
   # Frontend (Port 8080 -> Service Port 80)
   kubectl port-forward svc/frontend 8080:80 -n social-media-dashboard
   
   # Backend (Port 5000 -> Service Port 3000)
   kubectl port-forward -n social-media-dashboard svc/backend 5000:3000
   ```

4. **Anwendung öffnen:**
   http://localhost:8080
   
### Nützliche Makefile-Befehle

```bash
# Cluster-Status anzeigen
make status

# Logs anzeigen
make logs

# Cluster neu starten
make clean
make k3d-up OWNER=frani1611 TAG=latest

# Nur Secrets neu erstellen
make k8s-create-secrets

# Deployments manuell neu deployen
make deploy-k3d
```

### Troubleshooting

**Pods crashen:**
```bash
# Pod-Status prüfen
kubectl get pods -n social-media-dashboard

# Logs eines Pods ansehen
kubectl logs <pod-name> -n social-media-dashboard

# Pod beschreiben
kubectl describe pod <pod-name> -n social-media-dashboard
```

**Secrets fehlen:**
```bash
# Secrets neu erstellen
cd Code/social-media-dashboard
make k8s-create-secrets

# Deployments neu starten
kubectl rollout restart deployment/backend -n social-media-dashboard
kubectl rollout restart deployment/frontend -n social-media-dashboard
```

**Port-Forwarding funktioniert nicht:**
```bash
# Prüfe ob Services existieren
kubectl get svc -n social-media-dashboard

# Prüfe ob Pods laufen
kubectl get pods -n social-media-dashboard

# Port-Forwarding mit verbose output
kubectl port-forward -v=9 -n social-media-dashboard service/frontend 8080:80
```

### CI/CD Pipeline Setup

1. **PAT für GHCR erstellen:**
   - GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - Scopes: `write:packages`, `delete:packages`, `repo`
   - Token als Repository Secret `GHCR_TOKEN` hinzufügen

2. **KUBECONFIG als Secret hinzufügen:**
   - Kopiere den Inhalt von `~/.kube/config`
   - Füge ihn als Repository Secret `KUBECONFIG` hinzu

3. **imagePullSecret im Cluster erstellen:**
   ```bash
   kubectl create secret docker-registry regcred \
     --docker-server=ghcr.io \
     --docker-username=<GITHUB_USERNAME> \
     --docker-password=<GHCR_TOKEN> \
     --docker-email=<EMAIL> \
     -n social-media-dashboard
   ```

4. **Pipeline triggern:**
   ```bash
   git add .
   git commit -m "Update configuration"
   git push origin main
   ```

Die Pipeline führt automatisch aus:
- SBOM-Generierung (Syft)
- SAST (CodeQL)
- Secret Scan (gitleaks)
- SCA (Trivy)
- Image Build & Push
- Image Signing (Cosign keyless)
- Quality Gate
- Evidence-Speicherung

