# TODO - Security by Design Projekt

## 🔴 KRITISCH (Muss vor Abgabe fertig sein)

### 1. Kubernetes Security Hardening
- [ ] **Security Context in allen Deployments** (`k8s/backend-deployment.yaml`, `k8s/frontend-deployment.yaml`, `k8s/mongodb-statefulset.yaml`)
  - [ ] `runAsNonRoot: true` hinzufügen
  - [ ] `readOnlyRootFilesystem: true` setzen
  - [ ] `allowPrivilegeEscalation: false` setzen
  - [ ] `capabilities.drop: [ALL]` konfigurieren
  - [ ] Dedizierte Service Accounts erstellen (nicht default)

### 2. Network Policies
- [ ] **Network Policy für MongoDB** erstellen (`k8s/mongodb-network-policy.yaml`)
  - [ ] Nur Backend darf auf Port 27017 zugreifen
  - [ ] Deny-All als Default für Ingress
- [ ] **Network Policy für Backend** erstellen (`k8s/backend-network-policy.yaml`)
  - [ ] Nur Frontend/Ingress darf auf Backend zugreifen
  - [ ] Backend darf zu MongoDB (Port 27017)
  - [ ] Backend darf zu Cloudinary (HTTPS)

### 3. TLS/HTTPS Konfiguration
- [ ] **Ingress TLS konfigurieren** (`k8s/ingress.yaml`)
  - [ ] TLS-Zertifikat einbinden (self-signed oder Let's Encrypt)
  - [ ] HTTPS Redirect aktivieren
  - [ ] TLS 1.3 erzwingen
- [ ] **Certificate Authority** (optional)
  - [ ] Cert-Manager installieren (K8s Operator)
  - [ ] ClusterIssuer für Let's Encrypt erstellen
  - ODER: Self-Signed Certificate generieren (`openssl req -x509...`)

### 4. CI/CD Pipeline Vollständig Implementieren
- [ ] **SBOM Generierung** (`syft` oder `cyclonedx`)
- [ ] **SAST** (Static Application Security Testing)
  - [ ] Snyk oder Semgrep integrieren
- [ ] **SCA** (Software Composition Analysis)
  - [ ] Trivy für Dependency Scanning
- [ ] **Secret Scanning**
  - [ ] Gitleaks in Pipeline integrieren
- [ ] **Container Image Signing**
  - [ ] Cosign für Image Signing
- [ ] **Quality Gates** implementieren
  - [ ] Abbruch bei gefundenen Secrets
  - [ ] Abbruch bei CVSS ≥ 7.0
  - [ ] Abbruch bei fehlenden Signaturen
- [ ] **Kubernetes Deployment** aus Pipeline
  - [ ] Service Account für CI/CD mit minimalen Rechten
  - [ ] kubectl apply oder Helm Deployment

### 5. Dokumentation vervollständigen
- [ ] **Tech-Stack Beschreibung** in README.md
  - [ ] Frontend: Vue 3 + TypeScript + Vite
  - [ ] Backend: Node.js + Express + MongoDB
  - [ ] Infrastructure: Kubernetes + Docker
  - [ ] CI/CD: GitHub Actions
- [ ] **Komponenten-Beschreibung** (alle im Architekturdiagramm)
  - [ ] User (Browser)
  - [ ] Frontend Service
  - [ ] Backend API
  - [ ] MongoDB
  - [ ] Google OAuth
  - [ ] Cloudinary
  - [ ] Ingress Controller
  - [ ] CI/CD Pipeline
- [ ] **Sicherheitsfeatures dokumentieren**
  - [ ] Authentifizierung (JWT + bcrypt + Google SSO)
  - [ ] Input Validation (NoSQL Injection Prevention)
  - [ ] RBAC (Role-Based Access Control)
  - [ ] Security Headers
  - [ ] Rate Limiting
  - [ ] Network Policies
  - [ ] Pod Security
- [ ] **Nicht-sichere Parts erklären**
  - [ ] Repudiation (R): Warum kein Audit Log?
  - [ ] Denial of Service (D): Warum kein vollständiges Rate Limiting?
  - [ ] JWT in localStorage (statt HttpOnly Cookie)
  - [ ] MongoDB ohne Encryption at Rest
- [ ] **Deployment-Prozess beschreiben**
  - [ ] CI/CD Pipeline Steps
  - [ ] Kubernetes Deployment Ablauf
  - [ ] Rollback-Strategie
- [ ] **Lessons Learned** schreiben
  - [ ] Was lief gut?
  - [ ] Welche Herausforderungen?
  - [ ] Was würde man anders machen?

---

## 🟡 WICHTIG (Sollte implementiert werden)

### 6. Security Headers im Backend
- [ ] **Helmet.js** installieren und konfigurieren
  - [ ] HSTS (Strict-Transport-Security)
  - [ ] CSP (Content-Security-Policy)
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-XSS-Protection: 1; mode=block

### 7. Rate Limiting
- [ ] **express-rate-limit** installieren
  - [ ] Login: 5 Versuche / 15 Minuten
  - [ ] Register: 3 Versuche / Stunde
  - [ ] API: 100 Requests / Minute pro IP
- [ ] **Redis** als Store (optional, für Production)

### 8. Logging & Monitoring
- [ ] **Structured Logging** (Winston oder Pino)
  - [ ] JSON Format für Logs
  - [ ] Log Levels (info, warn, error)
  - [ ] Correlation IDs
- [ ] **Security Event Logging** erweitern
  - [ ] Login Success/Failure
  - [ ] Injection Attempts
  - [ ] Rate Limit Exceeded
  - [ ] Unauthorized Access

### 9. Namespace & RBAC in Kubernetes
- [ ] **Namespace** erstellen (`k8s/namespace.yaml`)
  - [ ] `social-media-app` Namespace
- [ ] **Service Accounts** für alle Pods
  - [ ] `backend-sa`
  - [ ] `frontend-sa`
  - [ ] `mongodb-sa`
- [ ] **RBAC Roles** definieren
  - [ ] Backend darf Secrets lesen
  - [ ] Frontend braucht keine besonderen Rechte
  - [ ] MongoDB braucht PersistentVolume

---

## 🟢 OPTIONAL (Nice-to-Have, Bonus-Punkte)

### 10. Multi-Factor Authentication (MFA)
- [ ] TOTP (Time-based One-Time Password)
- [ ] QR-Code für Authenticator App
- [ ] Backup Codes generieren

### 11. Email Verification
- [ ] Nodemailer Setup
- [ ] Verification Token generieren
- [ ] Email-Template erstellen
- [ ] Double-Opt-In Flow

### 12. File Upload Security
- [ ] Magic Byte Validation (nicht nur Extension)
- [ ] Virus Scanning (ClamAV)
- [ ] File Size Limits (bereits vorhanden)
- [ ] Content-Type Verification

### 13. Advanced Kubernetes Features
- [ ] **Pod Disruption Budget** (für High Availability)
- [ ] **Horizontal Pod Autoscaler** (HPA)
- [ ] **Resource Quotas** (für Namespace)
- [ ] **Liveness & Readiness Probes**

### 14. Monitoring & Alerting
- [ ] Prometheus für Metrics
- [ ] Grafana Dashboards
- [ ] Alertmanager für Notifications
- [ ] ELK Stack oder Loki für Logs

---

## ✅ ERLEDIGT

- [x] **Projektstruktur** erstellt (Frontend, Backend, K8s Manifests)
- [x] **Security Requirements** definiert (8 Requirements in `Sec_Requirements.md`)
- [x] **Architekturdiagramm** erstellt (`Documentation/Architekturdiagramm.md`)
- [x] **Threat Modeling** vollständig
  - [x] Data Flow Diagram (DFD) mit Vertrauensgrenzen
  - [x] STRIDE-Analyse für alle Komponenten
  - [x] Attack Tree für Worst-Case-Szenario
  - [x] 3 STRIDE-Kategorien implementiert (S, T, E)
  - [x] 2 STRIDE-Kategorien dokumentiert warum nicht (R, D)
- [x] **Input Validation** implementiert (`backend/src/utils/validation.js`)
- [x] **Password Hashing** mit bcrypt (10 rounds)
- [x] **JWT Authentication** (Token-basiert, 7 Tage Expiry)
- [x] **Google SSO** Integration (OAuth 2.0)
- [x] **RBAC** (Role-Based Access Control: Admin/User)
- [x] **Environment Variables** für Secrets (.env, nicht in Git)
- [x] **NoSQL Injection Prevention** (sanitizeObject, validateAuthInput)
- [x] **Generische Error Messages** (keine Informationslecks)
- [x] **Kubernetes Deployments** (Backend, Frontend, MongoDB)
- [x] **Docker-Compose** für lokale Entwicklung
- [x] **Password Hashing Dokumentation** (`PASSWORD_HASHING.md`)

---

## 📊 Prioritäten für die nächsten Schritte

### **Heute/Morgen (Must-Have):**
1. ✅ Threat Modeling ✅ FERTIG
2. ⏭️ Kubernetes Security Context + Network Policies (1-2 Stunden)
3. ⏭️ TLS/HTTPS Konfiguration (1 Stunde)
4. ⏭️ Security Headers (Helmet.js) (30 Minuten)

### **Diese Woche (Should-Have):**
5. ⏭️ CI/CD Pipeline vollständig (SBOM, SAST, SCA, Signing) (3-4 Stunden)
6. ⏭️ Rate Limiting implementieren (1 Stunde)
7. ⏭️ Dokumentation vervollständigen (2-3 Stunden)

### **Optional (Nice-to-Have):**
8. MFA/Email Verification
9. Advanced Monitoring
10. File Upload Hardening

---

## 🎯 Definition of Done

Das Projekt ist abgabebereit, wenn:

- [x] Threat Modeling vollständig (DFD, STRIDE, Attack Tree) ✅
- [ ] Kubernetes Security: Security Context + Network Policies ✅
- [ ] TLS konfiguriert (mindestens self-signed) ✅
- [ ] CI/CD Pipeline mit SBOM, SAST, SCA, Signing, Quality Gates ✅
- [ ] Deployment nach Kubernetes aus Pipeline ✅
- [ ] Dokumentation vollständig (alle 7 Kapitel) ✅
- [ ] Code läuft lokal UND in Kubernetes ✅
- [ ] Alle Security Requirements aus `Sec_Requirements.md` umgesetzt ✅
- [ ] README.md erklärt Setup, Deployment, Architektur ✅

---

## 📝 Notizen

**Zeitaufwand geschätzt:**
- Kubernetes Security: ~2 Stunden
- TLS Setup: ~1 Stunde
- CI/CD Pipeline: ~4 Stunden
- Dokumentation: ~3 Stunden
- **GESAMT: ~10 Stunden**

**Kritische Abhängigkeiten:**
- Kubernetes Cluster muss verfügbar sein (Minikube/K3s/Cloud)
- Docker Hub Account für Container Registry
- GitHub Secrets für CI/CD konfigurieren

**Testing Checklist:**
- [ ] Backend startet ohne Fehler (`npm run dev`)
- [ ] Frontend buildet erfolgreich (`npm run build`)
- [ ] Docker Images bauen (`docker build -t ...`)
- [ ] Kubernetes Manifests validieren (`kubectl apply --dry-run=client`)
- [ ] Pipeline läuft durch (alle Jobs grün)
- [ ] Health Checks funktionieren

---

**Letzte Aktualisierung:** 2. Dezember 2025  
**Nächster Meilenstein:** Kubernetes Security + TLS  
**Status:** 🟡 In Progress (Threat Modeling ✅ Done, Code-Implementierung pending)
