<p align="center">
  <img src="docs/assets/logo.png" alt="Imagenix Logo" width="200" />
</p>

<h1 align="center">Imagenix</h1>

<p align="center">
  <strong>AI-Powered Image Dataset Platform</strong><br/>
  Create, annotate, augment, and export production-ready image datasets for computer vision model training.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-10.3-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15.6-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-5.10-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-7.2-dc382d?logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776ab?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## What is Imagenix?

Imagenix is a full-stack platform that helps ML teams build high-quality image datasets faster. It handles the entire pipeline from raw images to training-ready exports:

1. **Upload** images via drag-and-drop with automatic deduplication
2. **Annotate** with bounding box tools or AI-powered auto-annotation (Grounding DINO)
3. **Augment** datasets using classical transforms, random pipelines, or generative AI (Stable Diffusion)
4. **Export** in COCO, YOLO, Pascal VOC, or as labeled images (PNG/JPG with annotations drawn)

---

## Features

### Dataset & Image Management
- Multi-project organization with per-project label classes
- Bulk drag-and-drop upload with presigned S3 URLs
- Duplicate detection via perceptual hashing (phash)
- Bulk image selection, deletion, and management
- Selection state persists across page navigation

### Annotation
- Interactive bounding box drawing on an HTML5 Canvas
- Resizable annotations with drag handles (NW, N, NE, E, SE, S, SW, W)
- Label classes with custom colors, auto-created during auto-annotation
- Annotation status tracking (draft, approved, rejected)
- Delete annotations individually or by label class (per-image or bulk)

### AI Auto-Annotation
- **Grounding DINO** open-vocabulary detection -- type any class name to detect it
- Configurable confidence threshold (default 0.35)
- Batch processing with real-time progress tracking
- Job runs in background -- navigate freely without losing progress
- Auto-annotations saved as `draft` with `source: auto` for human review

### Classical Augmentation
- 14 transform types: flip, rotate, brightness, contrast, saturation, blur, noise, scale, crop, hue, gamma, sharpen, JPEG compression, translate
- Bounding box annotations automatically transform with images
- Live preview before applying
- 1-10x multiplier per source image
- Apply to selected images or entire dataset

### Random Augmentation (Training Pipeline)
- One-click random augmentation for model training workflows
- **Strength levels**: Low (1-2 transforms), Medium (2-4), High (3-6)
- Transforms randomly selected from geometry, color, and quality categories
- Optional seed input for reproducible results (per-image seed = hash of seed + imageId)
- Before/after preview with regenerate option
- Creates new augmented copies without modifying originals

### Generative Augmentation (Stable Diffusion + ControlNet)
- Structure-preserving image generation via ControlNet (Canny, Depth, HED)
- Preset variations: weather, lighting, background, nature scenes
- Custom free-form text prompts
- Anti-hallucination validation (Canny edge IoU > 0.7 with auto-retry)
- Dual ControlNet (Canny + Depth) for maximum structural fidelity
- RunPod (self-hosted GPU) or Replicate (cloud API) backends

### Export
| Format | Output | Use Case |
|--------|--------|----------|
| **COCO JSON** | `annotations/instances.json` | TensorFlow, Detectron2, MMDetection |
| **YOLO TXT** | Per-image `.txt` labels + `data.yaml` | Ultralytics YOLOv5/v8, Darknet |
| **Pascal VOC XML** | Per-image `.xml` annotations | PyTorch, Caffe, older frameworks |
| **Labeled JPG** | ZIP of images with bounding boxes drawn | Visual review, documentation |
| **Labeled PNG** | ZIP of images with bounding boxes drawn (lossless) | Quality inspection |

All exports are generated as ZIP archives with signed download URLs valid for 7 days. Labeled image exports include a `manifest.json` with full annotation metadata.

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20.11.0 |
| npm | >= 10.2.0 |
| Docker & Docker Compose | Latest |
| Python | >= 3.10 (optional, for generative features) |

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/imagenix.git
cd imagenix
cp .env.example .env
```

The default `.env` works for local development with Docker. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://imagenix:imagenix_dev_password@localhost:5432/imagenix` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Redis |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO (S3-compatible storage) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Backend API URL |
| `JWT_SECRET` | (set in .env) | JWT signing key |

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379), and MinIO (9000/9001) with auto-created buckets.

### 3. Install and Setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed         # Optional: creates demo user
```

### 4. Run

```bash
npm run dev
```

Frontend runs on **http://localhost:3000**, backend on **http://localhost:3001**.

### 5. ML Service (Optional)

Required only for generative augmentation:

```bash
cd apps/ml-service
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python main.py
```

### Demo Credentials

After `npm run db:seed`:
- **Email:** `demo@imagenix.ai`
- **Password:** `demo123`

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| MinIO Console | http://localhost:9001 (`minioadmin` / `minioadmin123`) |
| Prisma Studio | `npm run db:studio` |
| ML Service | http://localhost:8000 (if running) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IMAGENIX PLATFORM                          │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────────┐  │
│  │   Frontend    │     │   Backend    │     │   ML Service       │  │
│  │  Next.js 14   │────▶│  NestJS 10   │────▶│  FastAPI + PyTorch │  │
│  │  Port 3000    │REST │  Port 3001   │REST │  Port 8000         │  │
│  └──────────────┘     └──────┬───────┘     └────────────────────┘  │
│                              │                                      │
│               ┌──────────────┼──────────────┐                       │
│               │              │              │                       │
│         ┌─────▼─────┐ ┌─────▼────┐ ┌───────▼─────┐                │
│         │ PostgreSQL │ │  Redis   │ │    MinIO    │                │
│         │  Port 5432 │ │ Port 6379│ │  Port 9000  │                │
│         └───────────┘ └──────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

| Flow | Description |
|------|-------------|
| Frontend → Backend | REST API with JWT Bearer authentication |
| Backend → PostgreSQL | Data persistence via Prisma ORM |
| Backend → Redis | Job progress tracking and caching |
| Backend → MinIO | Image and export file storage via presigned URLs |
| Backend → Replicate | Auto-annotation (Grounding DINO) via Replicate API |
| Backend → ML Service | Generative augmentation (Stable Diffusion + ControlNet) |

---

## Project Structure

```
imagenix/
├── apps/
│   ├── frontend/                     # Next.js 14 application
│   │   ├── src/
│   │   │   ├── app/(auth)/           # Login, Register
│   │   │   ├── app/(app)/            # Dashboard, Projects, Datasets,
│   │   │   │   └── projects/         # Annotation, Augmentation
│   │   │   ├── components/           # React components (shadcn/ui)
│   │   │   ├── lib/                  # API client, utilities
│   │   │   └── stores/               # Zustand stores (annotation, dataset, auth)
│   │   └── public/
│   │
│   ├── backend/                      # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/                 # JWT authentication & sessions
│   │   │   ├── projects/             # Project CRUD
│   │   │   ├── datasets/             # Dataset CRUD & ownership
│   │   │   ├── images/               # Image upload, list, bulk delete
│   │   │   ├── annotations/          # Bounding box CRUD
│   │   │   ├── label-classes/        # Label class management
│   │   │   ├── augmentation/         # Classical, random & generative augmentation
│   │   │   ├── exports/              # COCO, YOLO, VOC, labeled image exports
│   │   │   ├── jobs/                 # Background job processing & auto-annotation
│   │   │   ├── storage/              # S3/MinIO abstraction
│   │   │   ├── redis/                # Redis client module
│   │   │   └── prisma/               # Prisma database module
│   │   └── prisma/                   # Schema & migrations
│   │
│   └── ml-service/                   # Python FastAPI ML microservice
│       ├── api/                      # Route handlers
│       ├── models/                   # Model manager (SD + ControlNet)
│       ├── utils/                    # Image processing utilities
│       └── main.py                   # Entry point
│
├── packages/
│   ├── shared-types/                 # Shared TypeScript interfaces
│   └── ui-components/                # Shared UI library
│
├── docker-compose.yml                # Infrastructure (Postgres, Redis, MinIO)
├── turbo.json                        # Turborepo config
└── package.json                      # Root workspace
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Dropzone, Axios |
| **Backend** | NestJS 10, Prisma 5.10, Sharp 0.33, Archiver, Passport + JWT, class-validator |
| **Database** | PostgreSQL 15.6, Redis 7.2 |
| **Storage** | MinIO (S3-compatible), presigned URLs for upload/download |
| **ML Service** | FastAPI, PyTorch, Diffusers (Stable Diffusion v1.5), ControlNet, OpenCV |
| **Infrastructure** | Docker Compose, Turborepo, Husky + lint-staged, ESLint + Prettier |

---

## Database Schema

| Model | Description |
|-------|-------------|
| **User** | Accounts with email, password hash, role, and plan |
| **Session** | JWT refresh token sessions |
| **Project** | Top-level organizational unit |
| **Dataset** | Collection of images within a project |
| **LabelClass** | Label categories with hex colors, scoped per project |
| **Image** | Uploaded images with metadata (dimensions, hash, synthetic flag) |
| **Annotation** | Bounding boxes (x, y, width, height) with confidence, source, and status |
| **Job** | Background job tracking (auto-annotation, augmentation, export) |
| **Export** | Completed export files with format, size, and expiration |

---

## API Reference

**Base URL:** `http://localhost:3001/api/v1`

All authenticated endpoints require: `Authorization: Bearer <access_token>`

### Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

### Projects
```
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

### Datasets
```
POST   /projects/:id/datasets
GET    /datasets/:id
PATCH  /datasets/:id
DELETE /datasets/:id
```

### Images
```
POST   /datasets/:id/images/upload-url
POST   /datasets/:id/images/commit
GET    /datasets/:id/images
POST   /datasets/:id/images/bulk-delete
GET    /images/:id
DELETE /images/:id
```

### Annotations
```
POST   /images/:id/annotations
GET    /images/:id/annotations
PATCH  /annotations/:id
DELETE /annotations/:id
POST   /images/:id/annotations/bulk
```

### Label Classes
```
POST   /datasets/:id/label-classes
GET    /datasets/:id/label-classes
PATCH  /label-classes/:id
DELETE /label-classes/:id
```

### Jobs
```
POST   /datasets/:id/jobs/auto-annotate
GET    /jobs/:id
POST   /jobs/:id/cancel
```

### Augmentation
```
GET    /augmentation/capabilities
POST   /datasets/:id/augmentation/classical
POST   /datasets/:id/augmentation/generative
POST   /datasets/:id/augmentation/random
POST   /images/:id/augmentation/preview
POST   /images/:id/augmentation/random/preview
```

### Exports
```
POST   /datasets/:id/exports
GET    /exports
GET    /exports/:id
GET    /exports/:id/download
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description",
    "requestId": "uuid"
  }
}
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in dev mode |
| `npm run dev:frontend` | Start only frontend |
| `npm run dev:backend` | Start only backend |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start infrastructure containers |
| `npm run docker:down` | Stop infrastructure containers |

---

## Keyboard Shortcuts (Annotation Editor)

| Shortcut | Action |
|----------|--------|
| `V` | Select / Move tool |
| `B` | Bounding box draw tool |
| `Delete` | Delete selected annotation |
| `Ctrl + S` | Save annotations |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Undo / Redo |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| Arrow Keys | Navigate between images |
| `Escape` | Deselect / Cancel |

---

## Troubleshooting

**Port already in use**
```bash
# Windows
taskkill /F /IM node.exe /T
# macOS/Linux
lsof -ti:3000,3001 | xargs kill -9
```

**Database connection failed**
```bash
docker compose down && docker compose up -d
# Check: docker logs imagenix-postgres
```

**Prisma generate fails (EPERM on Windows)**
1. Close all terminals and IDE
2. `taskkill /F /IM node.exe /T`
3. `rmdir /s /q node_modules && npm install && npm run db:generate`

**MinIO buckets missing** -- Open http://localhost:9001, create `imagenix-uploads` and `imagenix-exports` manually.

**ML Service "503 Pipeline not loaded"** -- Models are loading. Wait 2-3 minutes or run `curl -X POST http://localhost:8000/models/load`.

---

## Roadmap

- [x] Classical Augmentation (14 transforms with annotation preservation)
- [x] Random Augmentation Pipeline (strength-based, seeded, training-ready)
- [x] Generative Augmentation (Stable Diffusion + ControlNet)
- [x] AI Auto-Annotation (Grounding DINO)
- [x] Labeled Image Export (PNG/JPG with annotations drawn)
- [x] Annotation Resizing (drag handles)
- [x] Bulk Image Management (select, delete)
- [x] Anti-Hallucination Validation
- [x] Background Job Persistence (navigate freely during jobs)
- [ ] Polygon Annotation
- [ ] Semantic Segmentation
- [ ] Team Collaboration
- [ ] Active Learning
- [ ] Cloud Deployment (AWS / GCP / Azure)
- [ ] In-Platform Model Training

---

## License

MIT License -- see [LICENSE](LICENSE) for details.
