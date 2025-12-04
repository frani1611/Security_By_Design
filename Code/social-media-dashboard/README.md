# Social Media Dashboard

## Projektübersicht
Das Social Media Dashboard ist eine Anwendung, die es Benutzern ermöglicht, Bilder und Posts sicher hochzuladen und zu verwalten. Die Anwendung umfasst eine Bilder-Upload-Funktion sowie eine umfassende Account-Verwaltung.

## Technologien
- **Frontend:** Vue.js
- **Backend:** Node.js (Express)
- **Datenbank:** MongoDB
- **Cloud-Speicher:** Cloudinary
- **Containerisierung:** Docker
- **Orchestrierung:** Kubernetes

## Projektstruktur
```
social-media-dashboard/
├── docker-compose.yml               # Lokale Entwicklungsumgebung
├── README.md                        # Diese Datei
├── PASSWORD_HASHING.md              # Dokumentation: Passwort-Sicherheit
│
├── frontend/                        # Vue 3 + TypeScript Frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── Dockerfile
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── components/
│       │   └── Header.vue
│       ├── views/
│       │   ├── Home.vue
│       │   ├── Auth.vue
│       │   └── Dashboard.vue
│       ├── router/
│       │   └── index.ts
│       ├── services/
│       │   └── api.ts
│       ├── store/
│       │   └── index.ts
│       ├── types/
│       │   └── index.ts
│       ├── utils/
│       │   └── inactivityTimer.ts
│       └── styles/
│           └── global.css
│
├── backend/                        # Node.js + Express Backend
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── googleAuthController.js
│       │   └── uploadController.js
│       ├── middleware/
│       │   └── auth.middleware.js
│       ├── models/
│       │   └── user.model.js
│       ├── routes/
│       │   └── index.js
│       ├── services/
│       │   └── cloudinary.service.js
│       └── utils/
│           └── validation.js
│
├── k8s/                            # Kubernetes Manifests & Security
│   ├── backend-deployment.yaml     # Backend Deployment
│   ├── frontend-deployment.yaml    # Frontend Deployment
│   ├── mongodb-statefulset.yaml    # MongoDB StatefulSet
│   ├── ingress.yaml                # Ingress Configuration
│   ├── policies/                   # Network & Security Policies
│   │   └── (Placeholder for future policies)
│   ├── rbac/                       # Role-Based Access Control
│   │   └── (Placeholder for future RBAC configs)
│   └── certs/                      # TLS Zertifikate
│       └── (Placeholder for certificates)
│
├── .github/                        # GitHub-Konfiguration
│   └── workflows/                  # GitHub Actions CI/CD
│       └── (Placeholder for workflows)
│
├── scripts/                        # Automation Scripts
│   └── (Placeholder for deployment scripts)
│
└── config/                         # Globale Konfiguration
    └── (Placeholder for config files)
```

## Installation und Ausführung

### Lokale Entwicklung (Docker Compose)
```bash
# Docker Compose starten (Frontend, Backend, MongoDB)
docker-compose up
```

Zugriff auf:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: localhost:27017

### Backend einzeln
```bash
cd backend
npm install
npm run dev
```

### Frontend einzeln
```bash
cd frontend
npm install
npm run dev
```

### Kubernetes Deployment

Die K8s Manifests sind vorbereitet in `k8s/`:
```bash
# Manifests deployen
kubectl apply -f k8s/

# Status prüfen
kubectl get pods
kubectl logs -f deployment/backend
```

