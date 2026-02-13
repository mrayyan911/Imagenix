<p align="center">
  <img src="docs/assets/logo.png" alt="Imagenix Logo" width="200" />
</p>

<h1 align="center">Imagenix</h1>

<p align="center">
  <strong>AI Dataset Intelligence Platform</strong><br/>
  Build high-quality image datasets faster with AI-powered annotation, augmentation, and generative data synthesis
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-10.3-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776ab?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/PostgreSQL-15.6-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-5.10-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-7.2-dc382d?logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Stable%20Diffusion-v1.5-blueviolet" alt="Stable Diffusion" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="#-overview">Overview</a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-architecture">Architecture</a> &bull;
  <a href="#-project-structure">Project Structure</a> &bull;
  <a href="#-tech-stack">Tech Stack</a> &bull;
  <a href="#-api-reference">API</a> &bull;
  <a href="#-ml-service">ML Service</a> &bull;
  <a href="#-deployment">Deployment</a> &bull;
  <a href="#-contributing">Contributing</a>
</p>

---

## Overview

Imagenix is an **end-to-end, cloud-native platform** designed for machine learning teams to efficiently create, manage, annotate, augment, and export high-quality image datasets. It combines traditional data engineering with cutting-edge **generative AI** to help you go from raw images to production-ready training data in a fraction of the time.

Whether you are training object detection models, building classification systems, or preparing data for any computer vision task, Imagenix streamlines every step of the workflow:

1. **Upload** images via drag-and-drop with automatic deduplication
2. **Annotate** with interactive bounding box tools or AI-powered auto-annotation
3. **Augment** datasets with classical transforms *and* AI-generated synthetic images
4. **Export** in COCO, YOLO, or Pascal VOC format -- ready for training

---

## Features

### Dataset Management

| Feature | Description |
|---------|-------------|
| **Multi-Project Organization** | Organize datasets across multiple projects with role-based access |
| **Bulk Image Upload** | Drag-and-drop upload with automatic thumbnail generation via presigned S3 URLs |
| **Duplicate Detection** | Perceptual hashing (`phash`) prevents duplicate images from entering the dataset |
| **Version Tracking** | Track dataset changes and maintain version history with parent-child lineage |
| **Synthetic Image Tagging** | Generated images are automatically flagged as `isSynthetic` with source metadata |

### Annotation Tools

| Feature | Description |
|---------|-------------|
| **Interactive Canvas** | Smooth bounding box annotation powered by React Konva with zoom, pan, and keyboard shortcuts |
| **Label Management** | Create and manage label classes with custom hex colors, scoped per project |
| **Bulk Operations** | Select and modify multiple annotations at once |
| **Auto-Save** | Annotations are automatically saved as you work |
| **Annotation Status** | Track annotations as `draft`, `approved`, or `rejected` for quality control |

### AI-Powered Auto-Annotation

| Feature | Description |
|---------|-------------|
| **Grounding DINO** | Open-vocabulary object detection -- detect any object by typing its name |
| **Confidence Filtering** | Set a confidence threshold (default 0.35) to control annotation quality |
| **Auto Label Creation** | Label classes are automatically created if they don't already exist |
| **Batch Processing** | Annotate entire datasets in a single background job with real-time progress |
| **Draft Annotations** | Auto-annotations are saved as `draft` with `source: 'auto'` for human review |

### Classical Augmentation Studio

| Feature | Description |
|---------|-------------|
| **10 Transform Types** | Flip (H/V), rotate, brightness, contrast, saturation, blur, noise, scale, crop |
| **Annotation Preservation** | Bounding boxes automatically transform with images (coordinates recalculated) |
| **Live Preview** | See augmentation effects on a sample image before committing |
| **Multiplier Control** | Generate 1-10 augmented copies per source image |
| **Selective Processing** | Apply to specific images or the entire dataset |

### Generative Augmentation (Stable Diffusion + ControlNet)

| Feature | Description |
|---------|-------------|
| **Structure-Preserving Generation** | ControlNet (Canny, Depth, HED) ensures generated images maintain the spatial layout of originals |
| **Preset Variation Types** | Weather (rain, snow, fog), lighting (night, golden hour), background, nature scenes |
| **Custom Prompts** | Free-form text prompts for style transfer and custom variations |
| **Anti-Hallucination** | Edge similarity validation ensures structural consistency (Canny IoU > 0.7) |
| **Automatic Retries** | Up to 3 generation attempts if hallucination is detected |
| **Dual ControlNet** | Combine Canny + Depth for maximum structural preservation |
| **Multiple Providers** | RunPod (self-hosted GPU) or Replicate (cloud API) as generation backends |

### Export Formats

| Format | File Structure | Use Case |
|--------|---------------|----------|
| **COCO JSON** | `annotations/coco.json` + images | TensorFlow, Detectron2, MMDetection |
| **YOLO TXT** | Per-image `.txt` labels + `data.yaml` | Ultralytics YOLOv5/v8, Darknet |
| **Pascal VOC XML** | Per-image `.xml` annotations | PyTorch, Caffe, older frameworks |

Exports are generated as ZIP archives with signed download URLs (valid for 7 days).

---

## Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | >= 20.11.0 | Runtime for frontend and backend |
| **npm** | >= 10.2.0 | Package manager |
| **Docker** & Docker Compose | Latest | Infrastructure services |
| **Python** | >= 3.10 | ML service (optional, only for generative features) |

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/imagenix.git
cd imagenix
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your preferred editor
# The defaults work for local development with Docker
```

<details>
<summary><strong>Key environment variables</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://imagenix:imagenix_dev_password@localhost:5432/imagenix` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key...` | JWT signing secret (change in production!) |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO / S3 endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | MinIO / S3 access key |
| `S3_SECRET_KEY` | `minioadmin123` | MinIO / S3 secret key |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Backend API URL for the frontend |
| `FEATURE_AUTO_ANNOTATION` | `true` | Enable auto-annotation feature |
| `FEATURE_AUGMENTATION` | `true` | Enable classical augmentation |
| `FEATURE_GENERATIVE_AUGMENTATION` | `true` | Enable generative augmentation |
| `GENERATIVE_PROVIDER` | `runpod` | Generative backend: `runpod` or `replicate` |
| `ML_SERVICE_URL` | `http://localhost:8000` | URL of the ML microservice |

</details>

### 3. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and MinIO
docker compose up -d

# Verify all containers are healthy
docker compose ps
```

This starts:
- **PostgreSQL 15.6** on port `5432`
- **Redis 7.2** on port `6379`
- **MinIO** on port `9000` (API) and `9001` (Console)
- **MinIO Init** container (creates `imagenix-uploads` and `imagenix-exports` buckets)

### 4. Install Dependencies & Setup Database

```bash
# Install all workspace dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Start frontend (port 3000) and backend (port 3001) simultaneously
npm run dev
```

### 6. (Optional) Start the ML Service

For generative augmentation features, you need the ML microservice:

```bash
cd apps/ml-service

# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the ML service (CPU mode, models loaded on demand)
PRELOAD_MODELS=false python main.py
```

> **Note:** Generative augmentation requires a CUDA-capable GPU for reasonable performance. For CPU-only systems, the ML service will start but generation will be very slow. See the [Deployment](#-deployment) section for GPU cloud options.

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | -- |
| **Backend API** | http://localhost:3001/api/v1 | -- |
| **ML Service** | http://localhost:8000 | -- |
| **ML Health Check** | http://localhost:8000/health | -- |
| **MinIO Console** | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| **Prisma Studio** | `npm run db:studio` | -- |

### Demo Credentials

After running `npm run db:seed`:

- **Email:** `demo@imagenix.ai`
- **Password:** `demo123`

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

> Configure classical and generative augmentation transforms with live preview

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
┌──────────────────────────────────────────────────────────────────────────────┐
│                              IMAGENIX PLATFORM                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐       ┌───────────────┐       ┌───────────────────────┐   │
│  │   Frontend     │       │   Backend     │       │   ML Service          │   │
│  │  (Next.js 14)  │──────▶│  (NestJS 10)  │──────▶│  (FastAPI + PyTorch)  │   │
│  │  Port 3000     │ REST  │  Port 3001    │ REST  │  Port 8000            │   │
│  └───────────────┘       └───────┬───────┘       └───────────────────────┘   │
│                                  │                         │                  │
│                    ┌─────────────┼─────────────┐           │ GPU (CUDA)       │
│                    │             │             │           │                  │
│              ┌─────▼─────┐ ┌────▼─────┐ ┌─────▼─────┐    │                  │
│              │ PostgreSQL │ │  Redis   │ │   MinIO   │    │                  │
│              │ (Database) │ │ (Cache & │ │ (Object   │    │                  │
│              │ Port 5432  │ │  Jobs)   │ │  Storage) │    │                  │
│              │            │ │ Port 6379│ │ Port 9000 │    │                  │
│              └────────────┘ └──────────┘ └───────────┘    │                  │
│                                                            │                  │
│                                              ┌─────────────▼──────────────┐  │
│                                              │  Stable Diffusion v1.5     │  │
│                                              │  + ControlNet (Canny,      │  │
│                                              │    Depth, HED)             │  │
│                                              └────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### How the Services Connect

| Flow | Description |
|------|-------------|
| **Frontend --> Backend** | Next.js app calls the NestJS REST API (`/api/v1/*`) with JWT Bearer authentication |
| **Backend --> PostgreSQL** | All data persistence via Prisma ORM (users, projects, datasets, images, annotations, jobs, exports) |
| **Backend --> Redis** | Job progress tracking, caching, session management |
| **Backend --> MinIO/S3** | Image storage and export file storage via presigned URLs |
| **Backend --> ML Service** | Generative augmentation requests via RunPod provider (HTTP + multipart form data) |
| **Backend --> Replicate** | Fallback generative provider and auto-annotation (Grounding DINO) via Replicate API |
| **ML Service --> GPU** | Stable Diffusion + ControlNet inference on CUDA-capable hardware |

---

## Project Structure

```
imagenix/
├── apps/
│   ├── frontend/                     # Next.js 14 application
│   │   ├── src/
│   │   │   ├── app/                  # App router pages
│   │   │   │   ├── (auth)/           #   Login, Register
│   │   │   │   └── (app)/            #   Dashboard, Projects, Datasets,
│   │   │   │       └── projects/     #   Annotation, Augmentation
│   │   │   ├── components/           # React components (shadcn/ui based)
│   │   │   ├── lib/                  # API client, utilities
│   │   │   └── stores/               # Zustand state management
│   │   └── public/                   # Static assets
│   │
│   ├── backend/                      # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/                 # JWT authentication & sessions
│   │   │   ├── users/                # User management
│   │   │   ├── projects/             # Project CRUD
│   │   │   ├── datasets/             # Dataset CRUD & ownership
│   │   │   ├── images/               # Image upload via presigned URLs
│   │   │   ├── annotations/          # Bounding box CRUD
│   │   │   ├── label-classes/        # Label class management
│   │   │   ├── augmentation/         # Classical & generative augmentation
│   │   │   │   ├── providers/        #   RunPod & Replicate providers
│   │   │   │   └── ...
│   │   │   ├── exports/              # COCO / YOLO / VOC export generation
│   │   │   ├── jobs/                 # Background job processing
│   │   │   ├── storage/              # S3/MinIO abstraction
│   │   │   ├── redis/                # Redis client module
│   │   │   └── prisma/               # Prisma database module
│   │   └── prisma/                   # Database schema & migrations
│   │
│   └── ml-service/                   # Python FastAPI ML microservice
│       ├── api/                      # Route handlers & validators
│       ├── models/                   # Model manager (SD + ControlNet)
│       ├── utils/                    # Image processing & ControlNet helpers
│       ├── main.py                   # FastAPI application entry point
│       ├── config.py                 # Configuration & environment
│       ├── requirements.txt          # Python dependencies
│       ├── Dockerfile                # Standard Docker build
│       └── Dockerfile.runpod         # RunPod-optimized build (pre-baked weights)
│
├── packages/
│   ├── shared-types/                 # TypeScript interfaces shared across apps
│   └── ui-components/                # Shared UI library
│
├── docs/                             # Documentation
│   ├── API.md                        # REST API reference
│   └── RUNPOD_DEPLOYMENT.md          # GPU cloud deployment guide
│
├── scripts/                          # Utility scripts
│   ├── demo-teacher.ts               # Demo: generate 5 variations of an image
│   └── test-generation.ts            # Test: single generation + validation
│
├── docker-compose.yml                # Local infrastructure (Postgres, Redis, MinIO)
├── turbo.json                        # Turborepo configuration
├── package.json                      # Root workspace configuration
└── .gitignore                        # Git ignore rules
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| React | 18 | UI library |
| TypeScript | 5.4 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | Latest | Accessible, unstyled primitives (Dialog, Dropdown, Tabs, Toast, etc.) |
| shadcn/ui | Latest | Pre-styled component library built on Radix |
| Zustand | 4.5 | Lightweight state management |
| React Hook Form + Zod | Latest | Form handling with schema validation |
| React Konva | 18.2 | HTML5 Canvas for annotation editor |
| Axios | 1.6 | HTTP client with interceptors (auto token refresh) |
| React Dropzone | Latest | Drag-and-drop file upload |
| Lucide React | Latest | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.11+ | Runtime |
| NestJS | 10.3 | Framework with dependency injection |
| Prisma | 5.10 | ORM, migrations, and schema management |
| PostgreSQL | 15.6 | Primary relational database |
| Redis | 7.2 | Caching, job progress, sessions |
| MinIO | Latest | S3-compatible object storage (local dev) |
| Passport.js + JWT | Latest | Authentication (access + refresh tokens) |
| Sharp | 0.33 | High-performance image processing (classical augmentation) |
| Archiver | 7.0 | ZIP file generation for exports |
| Replicate SDK | Latest | Cloud AI model API (auto-annotation, fallback generation) |
| Axios | Latest | HTTP client for ML service communication |
| class-validator | Latest | DTO validation with decorators |

### ML Service

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | 0.109 | High-performance async API framework |
| PyTorch | 2.2 | Deep learning framework |
| Diffusers | 0.30 | Stable Diffusion pipeline (Hugging Face) |
| Transformers | 4.44 | Model loading utilities |
| ControlNet | - | Structure-preserving conditioning (Canny, Depth, HED) |
| xformers | 0.0.24 | Memory-efficient attention for faster inference |
| OpenCV | 4.9 | Image preprocessing (Canny edge detection) |
| scikit-image | 0.22 | Structural similarity metrics (anti-hallucination) |
| Pillow | 10.2 | Image I/O and manipulation |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker Compose | Local development orchestration |
| Turborepo | Monorepo build system |
| Husky + lint-staged | Git hooks for code quality |
| ESLint + Prettier | Code formatting and linting |
| RunPod | GPU cloud for ML service deployment |

---

## Database Schema

The PostgreSQL database (managed by Prisma) includes the following models:

| Model | Description |
|-------|-------------|
| **User** | User accounts with email, password hash, role (`user`/`admin`), and plan |
| **Session** | JWT refresh token sessions with device tracking |
| **Project** | Top-level organizational unit owned by a user |
| **Dataset** | Collection of images within a project |
| **DatasetVersion** | Versioned snapshots of a dataset with parent-child lineage |
| **LabelClass** | Named label categories with hex colors, scoped per project |
| **Image** | Uploaded images with metadata (dimensions, hash, synthetic flag) |
| **Annotation** | Bounding box annotations (x, y, width, height) with confidence and status |
| **Job** | Background job tracking (auto-annotation, augmentation, export) |
| **Export** | Completed export files with format, size, and expiration |

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in parallel (via Turborepo) |
| `npm run dev:frontend` | Start only the Next.js frontend |
| `npm run dev:backend` | Start only the NestJS backend |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma client from schema |
| `npm run db:migrate` | Run pending database migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Prisma Studio GUI for data browsing |

### Infrastructure

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start PostgreSQL, Redis, MinIO containers |
| `npm run docker:down` | Stop and remove all containers |

### Build & Quality

| Command | Description |
|---------|-------------|
| `npm run build` | Production build of all apps |
| `npm run lint` | Run ESLint across the monorepo |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying files |

---

## API Reference

**Base URL:** `http://localhost:3001/api/v1`

All authenticated endpoints require a JWT token:

```
Authorization: Bearer <access_token>
```

### Authentication

```http
POST   /auth/register           # Create a new account
POST   /auth/login              # Login and receive access + refresh tokens
POST   /auth/refresh            # Refresh an expired access token
POST   /auth/logout             # Revoke the current session
GET    /auth/me                 # Get the current authenticated user
```

### Projects

```http
GET    /projects                # List all projects for the authenticated user
POST   /projects                # Create a new project
GET    /projects/:id            # Get project details with datasets
PATCH  /projects/:id            # Update project name/description
DELETE /projects/:id            # Delete project and all cascading data
```

### Datasets

```http
POST   /projects/:id/datasets          # Create a dataset in a project
GET    /datasets/:id                   # Get dataset with stats
PATCH  /datasets/:id                   # Update dataset metadata
DELETE /datasets/:id                   # Delete dataset and all images
```

### Images

```http
POST   /datasets/:id/images/upload-url    # Get a presigned S3 upload URL
POST   /datasets/:id/images/commit        # Confirm upload and create image record
GET    /datasets/:id/images               # List images (paginated)
GET    /images/:id                        # Get single image details
DELETE /images/:id                        # Delete image and its annotations
```

### Annotations

```http
POST   /images/:id/annotations           # Create a bounding box annotation
GET    /images/:id/annotations           # List all annotations for an image
PATCH  /annotations/:id                  # Update annotation position/size/status
DELETE /annotations/:id                  # Delete an annotation
POST   /images/:id/annotations/bulk      # Bulk create/update annotations
```

### Label Classes

```http
POST   /datasets/:id/label-classes       # Create a label class
GET    /datasets/:id/label-classes       # List label classes
PATCH  /label-classes/:id                # Update label class name/color
DELETE /label-classes/:id                # Delete label class
```

### Jobs

```http
POST   /datasets/:id/jobs/auto-annotate    # Start auto-annotation job
GET    /jobs/:id                           # Get job status and progress
POST   /jobs/:id/cancel                    # Cancel a running job
```

### Augmentation

```http
GET    /datasets/:id/augmentation/capabilities    # Get available transforms & variation types
POST   /datasets/:id/augmentation/classical       # Start classical augmentation job
POST   /datasets/:id/augmentation/generative      # Start generative augmentation job
POST   /datasets/:id/augmentation/preview         # Preview augmentation on a single image
```

### Exports

```http
POST   /datasets/:id/exports              # Create an export job (coco/yolo/voc)
GET    /exports                           # List user's exports
GET    /exports/:id                       # Get export status
GET    /exports/:id/download              # Get signed download URL
```

### Error Format

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the error",
    "details": [{ "field": "email", "issue": "Invalid email format" }],
    "requestId": "uuid"
  }
}
```

| Error Code | HTTP Status |
|------------|-------------|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL_ERROR` | 500 |

> For detailed request/response examples, see [docs/API.md](docs/API.md).

---

## ML Service

The ML microservice is a standalone **Python FastAPI** application that runs Stable Diffusion v1.5 with ControlNet for generative data augmentation.

### Supported Pipelines

| Pipeline | ControlNet Models | Best For |
|----------|-------------------|----------|
| **Canny** | `lllyasviel/sd-controlnet-canny` | Edge-preserving variations |
| **Depth** | `lllyasviel/sd-controlnet-depth` | 3D-structure-aware generation |
| **HED** | `lllyasviel/sd-controlnet-hed` | Soft edge detection |
| **Canny + Depth (Dual)** | Both Canny and Depth simultaneously | Maximum structural preservation |

### ML Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with device info and loaded models |
| `POST` | `/models/load` | Trigger manual model loading |
| `POST` | `/api/v1/generate/controlnet-canny` | Generate with Canny ControlNet |
| `POST` | `/api/v1/generate/controlnet-canny/image` | Same, returns raw PNG |
| `POST` | `/api/v1/generate/dual-control` | Generate with Canny + Depth |
| `POST` | `/api/v1/generate/dual-control/image` | Same, returns raw PNG |
| `POST` | `/api/v1/generate/safe-augmentation` | Preset-based safe generation |
| `POST` | `/api/v1/generate/safe-augmentation/image` | Same, returns raw PNG |
| `POST` | `/api/v1/validate/hallucination-check` | Structural similarity validation |

### Anti-Hallucination System

Generative augmentation includes built-in quality control:

1. **ControlNet Conditioning** (strength 0.95) preserves spatial structure from the original image
2. **Edge Similarity Validation** compares Canny edges between source and generated images
3. **Structural Similarity Threshold** (IoU > 0.7) rejects images that deviate too far
4. **Automatic Retries** (up to 3 attempts) if hallucination is detected
5. **Curated Prompt Templates** for safe variation types prevent prompt injection

### ML Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_HOST` | `0.0.0.0` | Bind address |
| `ML_PORT` | `8000` | Service port |
| `PRELOAD_MODELS` | `true` | Load models on startup |
| `MODEL_CACHE_DIR` | `/tmp/models` | Model weight cache directory |
| `SD_MODEL_ID` | `runwayml/stable-diffusion-v1-5` | Base Stable Diffusion model |
| `CONTROLNET_SCALE` | `0.95` | ControlNet conditioning strength |
| `GUIDANCE_SCALE` | `7.0` | Classifier-free guidance scale |
| `NUM_INFERENCE_STEPS` | `30` | Number of denoising steps |
| `MIN_STRUCTURAL_SIMILARITY` | `0.7` | Hallucination rejection threshold |
| `MAX_IMAGE_SIZE` | `1024` | Maximum input image dimension |
| `DEFAULT_OUTPUT_SIZE` | `512` | Default output image dimension |

---

## Deployment

### Local Development

The default setup uses Docker Compose for infrastructure and runs the application services natively:

```bash
docker compose up -d     # Start Postgres, Redis, MinIO
npm run dev              # Start frontend + backend
cd apps/ml-service && python main.py  # Start ML service (optional)
```

### GPU Cloud (RunPod)

For production generative augmentation, deploy the ML service to a GPU cloud:

1. **Build** the RunPod-optimized Docker image (pre-bakes model weights):
   ```bash
   cd apps/ml-service
   docker build -f Dockerfile.runpod -t imagenix-ml-runpod .
   ```

2. **Push** to your container registry:
   ```bash
   docker tag imagenix-ml-runpod YOUR_REGISTRY/imagenix-ml-runpod:latest
   docker push YOUR_REGISTRY/imagenix-ml-runpod:latest
   ```

3. **Deploy** on RunPod with a GPU pod (RTX 4090 recommended)

4. **Connect** the backend by updating `.env`:
   ```env
   GENERATIVE_PROVIDER=runpod
   ML_SERVICE_URL=https://your-pod-id-8000.proxy.runpod.net
   ```

### GPU Cost Estimates

| GPU | Hourly Cost | Generation Time |
|-----|-------------|-----------------|
| RTX 3090 (24 GB) | ~$0.35/hr | ~8-12s per image |
| RTX 4090 (24 GB) | ~$0.55/hr | ~5-8s per image |
| A100 (40 GB) | ~$1.10/hr | ~3-5s per image |

> For the full deployment guide, see [docs/RUNPOD_DEPLOYMENT.md](docs/RUNPOD_DEPLOYMENT.md).

---

## Environment Variables

<details>
<summary><strong>Complete Environment Variable Reference</strong></summary>

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://imagenix:imagenix_dev_password@localhost:5432/imagenix` | PostgreSQL connection string |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | -- | Secret key for signing JWTs (required) |
| `JWT_ACCESS_EXPIRATION` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token lifetime |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

### Object Storage (S3 / MinIO)

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_ENDPOINT` | `http://localhost:9000` | S3 endpoint URL |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin123` | S3 secret key |
| `S3_BUCKET_UPLOADS` | `imagenix-uploads` | Bucket for image uploads |
| `S3_BUCKET_EXPORTS` | `imagenix-exports` | Bucket for export files |
| `S3_REGION` | `us-east-1` | S3 region |
| `S3_FORCE_PATH_STYLE` | `true` | Use path-style URLs (required for MinIO) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend app URL |

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Node environment |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_AUTO_ANNOTATION` | `true` | Enable AI auto-annotation |
| `FEATURE_AUGMENTATION` | `true` | Enable classical augmentation |
| `FEATURE_GENERATIVE_AUGMENTATION` | `true` | Enable generative augmentation |

### Generative Augmentation

| Variable | Default | Description |
|----------|---------|-------------|
| `GENERATIVE_PROVIDER` | `runpod` | Provider: `runpod` or `replicate` |
| `ML_SERVICE_URL` | `http://localhost:8000` | ML microservice URL |
| `REPLICATE_API_TOKEN` | -- | Replicate API token (if using Replicate) |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_TTL` | `60` | Rate limit window (seconds) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

</details>

---

## Keyboard Shortcuts

### Annotation Editor

| Shortcut | Action |
|----------|--------|
| `V` | Select / Move tool |
| `B` | Bounding box draw tool |
| `Delete` / `Backspace` | Delete selected annotation |
| `Ctrl + S` | Save annotations |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom to fit |
| `Arrow Keys` | Navigate between images |
| `Escape` | Deselect / Cancel drawing |

---

## Troubleshooting

<details>
<summary><strong>Port already in use</strong></summary>

Kill processes using the ports:

```bash
# Windows (PowerShell)
taskkill /F /IM node.exe /T

# Linux / macOS
lsof -ti:3000,3001 | xargs kill -9
```

</details>

<details>
<summary><strong>Database connection failed</strong></summary>

1. Ensure Docker is running: `docker ps`
2. Restart containers: `docker compose down && docker compose up -d`
3. Verify PostgreSQL is healthy: `docker logs imagenix-postgres`
4. Check `DATABASE_URL` in your `.env` file

</details>

<details>
<summary><strong>Prisma generate fails (EPERM on Windows)</strong></summary>

1. Close all terminals and IDE
2. Kill Node processes: `taskkill /F /IM node.exe /T`
3. Delete node_modules: `rmdir /s /q node_modules`
4. Reinstall: `npm install && npm run db:generate`

</details>

<details>
<summary><strong>MinIO bucket not found</strong></summary>

The `minio-init` container creates buckets automatically. If they're missing:

1. Open MinIO Console: http://localhost:9001
2. Login: `minioadmin` / `minioadmin123`
3. Create buckets manually: `imagenix-uploads` and `imagenix-exports`

</details>

<details>
<summary><strong>ML Service: "503 Pipeline not loaded"</strong></summary>

Models are still loading. Wait 2-3 minutes after startup, or check logs:

```bash
# Trigger manual model loading
curl -X POST http://localhost:8000/models/load
```

</details>

<details>
<summary><strong>ML Service: CUDA out of memory</strong></summary>

- Use a GPU with more VRAM (24 GB+ recommended)
- Reduce `DEFAULT_OUTPUT_SIZE` in config
- Ensure no other GPU processes are running

</details>

<details>
<summary><strong>Generative augmentation returns low similarity scores</strong></summary>

- Increase `CONTROLNET_SCALE` (e.g., to `1.0`) for stricter structural preservation
- Use the `dual-control` pipeline (Canny + Depth) for maximum fidelity
- Reduce `NUM_INFERENCE_STEPS` to `20` for less deviation

</details>

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes following the project conventions
4. **Commit** with a descriptive message: `git commit -m "Add amazing feature"`
5. **Push** to your branch: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier run automatically via Husky)
- Write meaningful commit messages describing the "why"
- Add tests for new features when applicable
- Update documentation for user-facing changes
- Keep PRs focused -- one feature or fix per PR

### Code Quality

The project uses Husky pre-commit hooks that automatically:
- Run ESLint with auto-fix on staged `.ts/.tsx/.js/.jsx` files
- Run Prettier on all staged files
- Block commits with linting errors

---

## Roadmap

- [x] **Classical Augmentation** -- 10 transform types with annotation preservation
- [x] **Generative Augmentation** -- Stable Diffusion + ControlNet integration
- [x] **Anti-Hallucination** -- Structural similarity validation for generated images
- [x] **ML Microservice** -- Standalone FastAPI service with GPU support
- [x] **RunPod Deployment** -- GPU cloud deployment guide
- [ ] **Polygon Annotation** -- Support for non-rectangular regions
- [ ] **Semantic Segmentation** -- Pixel-level labeling
- [ ] **Team Collaboration** -- Multi-user annotation with conflict resolution
- [ ] **Active Learning** -- Smart sample selection for labeling priority
- [ ] **Cloud Deployment** -- One-click AWS / GCP / Azure deploy
- [ ] **Model Training** -- Train custom models directly from the platform

---

## License

MIT License -- see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with love for the ML community
</p>
