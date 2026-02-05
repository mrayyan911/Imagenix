<p align="center">
  <img src="docs/assets/logo.svg" alt="Imagenix Logo" width="200" />
</p>

<h1 align="center">Imagenix</h1>

<p align="center">
  <strong>AI Dataset Intelligence Platform</strong><br/>
  Build high-quality image datasets faster with AI-powered annotation and augmentation
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-10.3-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15.6-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-5.10-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-7.2-dc382d?logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## Overview

Imagenix is a cloud-native platform designed for machine learning teams to efficiently create, manage, and export high-quality image datasets. Whether you're training object detection models, building classification systems, or preparing data for computer vision tasks, Imagenix streamlines your workflow from raw images to production-ready datasets.

---

## Features

### Dataset Management
| Feature | Description |
|---------|-------------|
| **Multi-Project Organization** | Organize datasets across multiple projects with role-based access |
| **Bulk Image Upload** | Drag-and-drop upload with automatic thumbnail generation |
| **Duplicate Detection** | Perceptual hashing prevents duplicate images |
| **Version Tracking** | Track dataset changes and maintain version history |

### Annotation Tools
| Feature | Description |
|---------|-------------|
| **Interactive Canvas** | Smooth bounding box annotation with zoom, pan, and keyboard shortcuts |
| **Label Management** | Create and manage label classes with custom colors |
| **Bulk Operations** | Select and modify multiple annotations at once |
| **Auto-Save** | Annotations are automatically saved as you work |

### AI-Powered Features
| Feature | Description |
|---------|-------------|
| **Auto-Annotation** | One-click AI object detection using local models |
| **Smart Suggestions** | AI-assisted label recommendations based on image content |
| **Confidence Filtering** | Filter auto-annotations by confidence threshold |

### Data Augmentation Studio
| Feature | Description |
|---------|-------------|
| **Classical Transforms** | Flip, rotate, brightness, contrast, saturation, blur, noise, crop, scale |
| **Annotation Preservation** | Bounding boxes automatically transform with images |
| **Live Preview** | See augmentation effects before applying |
| **Batch Processing** | Apply transforms to entire datasets with multiplier control |
| **Generative Augmentation** | (Coming Soon) AI-generated synthetic images for dataset expansion |

### Export Formats
| Format | Use Case |
|--------|----------|
| **COCO JSON** | TensorFlow, Detectron2, MMDetection |
| **YOLO TXT** | Ultralytics YOLOv5/v8, Darknet |
| **Pascal VOC XML** | PyTorch, Caffe, older frameworks |

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.11.0
- **Docker** & Docker Compose
- **npm** >= 10.2.0

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/imagenix.git
cd imagenix

# 2. Install dependencies
npm install

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# 4. Setup database
npm run db:generate
npm run db:migrate
npm run db:seed  # Optional: adds sample data

# 5. Start development servers
npm run dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | — |
| **Backend API** | http://localhost:3001/api/v1 | — |
| **MinIO Console** | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| **Prisma Studio** | `npm run db:studio` | — |

### Demo Credentials

After seeding, login with:
- **Email**: `demo@imagenix.ai`
- **Password**: `demo123`

---

## Screenshots

<details>
<summary><strong>Dashboard</strong></summary>

> Overview of all projects with quick stats and recent activity

![Dashboard](docs/assets/screenshots/dashboard.png)

</details>

<details>
<summary><strong>Dataset Gallery</strong></summary>

> Browse images with thumbnail grid, filtering, and bulk selection

![Dataset Gallery](docs/assets/screenshots/dataset-gallery.png)

</details>

<details>
<summary><strong>Annotation Editor</strong></summary>

> Interactive canvas with bounding box tools and label panel

![Annotation Editor](docs/assets/screenshots/annotation-editor.png)

</details>

<details>
<summary><strong>Augmentation Studio</strong></summary>

> Configure classical and generative augmentation transforms

![Augmentation Studio](docs/assets/screenshots/augmentation-studio.png)

</details>

<details>
<summary><strong>Export Dialog</strong></summary>

> Export datasets in COCO, YOLO, or Pascal VOC formats

![Export Dialog](docs/assets/screenshots/export-dialog.png)

</details>

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           IMAGENIX                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │   Frontend   │────▶│   Backend    │────▶│   PostgreSQL     │    │
│  │  (Next.js)   │     │  (NestJS)    │     │   (Database)     │    │
│  │  Port 3000   │     │  Port 3001   │     │   Port 5432      │    │
│  └──────────────┘     └──────┬───────┘     └──────────────────┘    │
│                              │                                      │
│                              │                                      │
│                    ┌─────────┴─────────┐                           │
│                    │                   │                           │
│              ┌─────▼─────┐      ┌──────▼──────┐                    │
│              │   Redis   │      │    MinIO    │                    │
│              │  (Cache)  │      │  (Storage)  │                    │
│              │ Port 6379 │      │ Port 9000   │                    │
│              └───────────┘      └─────────────┘                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
imagenix/
├── apps/
│   ├── frontend/                 # Next.js 14 application
│   │   ├── src/
│   │   │   ├── app/              # App router pages
│   │   │   ├── components/       # React components
│   │   │   ├── lib/              # API clients, utilities
│   │   │   └── stores/           # Zustand state management
│   │   └── public/               # Static assets
│   │
│   └── backend/                  # NestJS API server
│       ├── src/
│       │   ├── auth/             # JWT authentication
│       │   ├── projects/         # Project management
│       │   ├── datasets/         # Dataset operations
│       │   ├── images/           # Image upload/management
│       │   ├── annotations/      # Bounding box CRUD
│       │   ├── augmentation/     # Classical & generative
│       │   ├── exports/          # Format conversion
│       │   └── jobs/             # Background processing
│       └── prisma/               # Database schema & migrations
│
├── packages/
│   ├── shared-types/             # TypeScript interfaces
│   └── ui-components/            # Shared UI library
│
├── docs/                         # Documentation
├── infrastructure/               # Deployment configs
└── docker-compose.yml            # Local development services
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| TypeScript | 5.4 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui | 0.9 | Accessible component library |
| Zustand | 4.5 | State management |
| React Hook Form | 7.50 | Form handling |
| React Konva | 18.2 | Canvas-based annotation |
| Axios | 1.6 | HTTP client |
| Lucide React | 0.344 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.11 | Runtime |
| NestJS | 10.3 | Framework with DI |
| Prisma | 5.10 | ORM & migrations |
| PostgreSQL | 15.6 | Primary database |
| Redis | 7.2 | Caching & job queues |
| MinIO | - | S3-compatible object storage |
| Passport.js | - | JWT authentication |
| Sharp | 0.33 | Image processing |
| Archiver | 7.0 | ZIP file generation |

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend & backend in dev mode |
| `npm run dev:frontend` | Start only frontend |
| `npm run dev:backend` | Start only backend |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset database (destructive) |

### Infrastructure

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start PostgreSQL, Redis, MinIO |
| `npm run docker:down` | Stop all containers |
| `npm run docker:logs` | View container logs |

### Build & Test

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run test` | Run test suite |
| `npm run test:e2e` | End-to-end tests |

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

### Authentication

```http
POST   /auth/register     # Create account
POST   /auth/login        # Get access + refresh tokens
POST   /auth/refresh      # Refresh access token
POST   /auth/logout       # Revoke session
GET    /auth/me           # Get current user
```

### Projects

```http
GET    /projects          # List user's projects
POST   /projects          # Create project
GET    /projects/:id      # Get project details
PATCH  /projects/:id      # Update project
DELETE /projects/:id      # Delete project (cascades)
```

### Datasets

```http
POST   /projects/:id/datasets        # Create dataset
GET    /datasets/:id                 # Get dataset with stats
PATCH  /datasets/:id                 # Update dataset
DELETE /datasets/:id                 # Delete dataset
```

### Images

```http
POST   /datasets/:id/images/upload-url   # Get presigned upload URL
POST   /datasets/:id/images/commit       # Confirm upload complete
GET    /datasets/:id/images              # List images (paginated)
GET    /images/:id                       # Get image details
DELETE /images/:id                       # Delete image
```

### Annotations

```http
POST   /images/:id/annotations       # Create annotation
GET    /images/:id/annotations       # List annotations
PATCH  /annotations/:id              # Update annotation
DELETE /annotations/:id              # Delete annotation
POST   /images/:id/annotations/bulk  # Bulk update
```

### Label Classes

```http
POST   /datasets/:id/label-classes   # Create label class
GET    /datasets/:id/label-classes   # List label classes
PATCH  /label-classes/:id            # Update label class
DELETE /label-classes/:id            # Delete label class
```

### Jobs

```http
POST   /datasets/:id/jobs/auto-annotate  # Start auto-annotation
GET    /jobs/:id                         # Get job status
POST   /jobs/:id/cancel                  # Cancel job
```

### Augmentation

```http
GET    /datasets/:id/augmentation/capabilities   # Get available transforms
POST   /datasets/:id/augmentation/classical      # Create classical augmentation job
POST   /datasets/:id/augmentation/generative     # Create generative augmentation job
POST   /datasets/:id/augmentation/preview        # Preview augmentation
```

### Exports

```http
POST   /datasets/:id/exports         # Create export job
GET    /exports                      # List user's exports
GET    /exports/:id                  # Get export status
GET    /exports/:id/download         # Get download URL
```

---

## Environment Variables

### Backend (`apps/backend/.env`)

```env
# Database
DATABASE_URL="postgresql://imagenix:imagenix_dev@localhost:5432/imagenix"

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRATION="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Object Storage (MinIO/S3)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin123"
S3_BUCKET_UPLOADS="imagenix-uploads"
S3_BUCKET_EXPORTS="imagenix-exports"

# Feature Flags
FEATURE_AUTO_ANNOTATION="true"
FEATURE_AUGMENTATION="true"
FEATURE_GENERATIVE_AUGMENTATION="false"
```

---

## Keyboard Shortcuts

### Annotation Editor

| Shortcut | Action |
|----------|--------|
| `V` | Select/Move tool |
| `B` | Bounding box tool |
| `Delete` / `Backspace` | Delete selected annotation |
| `Ctrl + S` | Save annotations |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `+` / `-` | Zoom in/out |
| `0` | Reset zoom |
| `Arrow Keys` | Navigate images |
| `Escape` | Deselect / Cancel |

---

## Troubleshooting

<details>
<summary><strong>Port already in use</strong></summary>

Kill processes using the ports:

```bash
# Windows (CMD)
taskkill /F /IM node.exe /T

# Linux/macOS
lsof -ti:3000,3001 | xargs kill -9
```

</details>

<details>
<summary><strong>Database connection failed</strong></summary>

1. Ensure Docker is running: `docker ps`
2. Restart containers: `docker compose down && docker compose up -d`
3. Verify PostgreSQL is healthy: `docker logs imagenix-postgres`

</details>

<details>
<summary><strong>Prisma generate fails (EPERM on Windows)</strong></summary>

1. Close all terminals and IDE
2. Kill node processes: `taskkill /F /IM node.exe /T`
3. Delete node_modules: `rmdir /s /q node_modules`
4. Reinstall: `npm install && npm run db:generate`

</details>

<details>
<summary><strong>MinIO bucket not found</strong></summary>

The init container creates buckets automatically. If missing:

1. Access MinIO Console: http://localhost:9001
2. Login: `minioadmin` / `minioadmin123`
3. Create buckets: `imagenix-uploads`, `imagenix-exports`

</details>

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m "Add amazing feature"`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## Roadmap

- [ ] **Polygon Annotation** - Support for non-rectangular regions
- [ ] **Semantic Segmentation** - Pixel-level labeling
- [ ] **Team Collaboration** - Multi-user annotation with conflict resolution
- [ ] **Generative Augmentation** - Stable Diffusion integration
- [ ] **Active Learning** - Smart sample selection for labeling
- [ ] **Cloud Deployment** - One-click AWS/GCP/Azure deploy

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with love for the ML community
</p>
