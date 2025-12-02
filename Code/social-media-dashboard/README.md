# Social Media Dashboard

## Projektübersicht
Das Social Media Dashboard ist eine Anwendung, die es Benutzern ermöglicht, Bilder und Posts sicher hochzuladen und zu verwalten. Die Anwendung umfasst eine Bilder-Upload-Funktion sowie eine umfassende Account-Verwaltung.

## Technologien
- **Frontend:** Vue.js
- **Backend:** Node.js (Express)
- **Datenbank:** MongoDB
- **Cloud-Speicher:** Cloudinary
- **Containerisierung:** Docker
- **Orchestrierung:** k3s

## Projektstruktur
```
social-media-dashboard
├── frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── public
│   │   └── index.html
│   └── src
│       ├── main.ts
│       ├── App.vue
│       ├── components
│       │   └── Header.vue
│       ├── views
│       │   ├── Dashboard.vue
│       │   └── Auth.vue
│       ├── router
│       │   └── index.ts
│       ├── store
│       │   └── index.ts
│       ├── services
│       │   └── api.ts
│       └── types
│           └── index.ts
├── backend
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src
│       ├── app.js
│       ├── server.js
│       ├── controllers
│       │   ├── authController.js
│       │   └── uploadController.js
│       ├── routes
│       │   └── index.js
│       ├── models
│       │   └── user.model.js
│       ├── services
│       │   └── cloudinary.service.js
│       ├── middleware
│       │   └── auth.middleware.js
│       └── config
│           └── db.js
├── k8s
│   ├── frontend-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── mongodb-statefulset.yaml
│   └── ingress.yaml
├── docker-compose.yml
├── .github
│   └── workflows
│       └── ci.yml
├── .gitignore
└── README.md
```

## Installation und Ausführung

### 1. Backend
- Navigiere zum Backend-Verzeichnis:
  ```
  cd backend
  ```
- Installiere die Abhängigkeiten:
  ```
  npm install
  ```
- Erstelle die Umgebungsvariablen:
  - Kopiere die `.env.example` in eine `.env` und passe die Werte an.
- Starte den Server:
  ```
  node src/server.js
  ```

### 2. Frontend
- Navigiere zum Frontend-Verzeichnis:
  ```
  cd frontend
  ```
- Installiere die Abhängigkeiten:
  ```
  npm install
  ```
- Starte die Entwicklungsumgebung:
  ```
  npm run dev
  ```

### 3. Docker und k3s
- Stelle sicher, dass Docker und k3s installiert sind.
- Baue die Docker-Images:
  ```
  docker-compose build
  ```
- Starte die Anwendung mit Docker Compose:
  ```
  docker-compose up
  ```
- Für die Bereitstellung in k3s, verwende die YAML-Dateien im `k8s`-Verzeichnis.

## Sicherheitsanforderungen
- Multi-Faktor-Authentifizierung (MFA)
- Rollenbasiertes Berechtigungssystem (Admin, User)
- Sichere Authentifizierung und Datenverschlüsselung

## Lizenz
Dieses Projekt steht unter der MIT-Lizenz.