# RunPod Deployment Guide — Imagenix ML Service

This guide covers building, pushing, and deploying the Imagenix ML microservice (Stable Diffusion + ControlNet) to [RunPod](https://www.runpod.io/).

---

## Architecture Overview

```
┌──────────────┐       HTTP       ┌───────────────────────┐
│  NestJS       │  ─────────────▶ │  FastAPI ML Service   │
│  Backend      │  (axios/form)   │  (Stable Diffusion +  │
│  (port 3001)  │  ◀───────────── │   ControlNet)         │
└──────────────┘                  │  (port 8000)          │
                                  └───────────────────────┘
                                          ▲
                                          │ GPU (CUDA)
                                  ┌───────┴───────┐
                                  │   RunPod Pod   │
                                  │   (RTX 4090    │
                                  │    or A100)    │
                                  └───────────────┘
```

## Prerequisites

- Docker installed locally
- A [RunPod](https://www.runpod.io/) account with GPU credits
- A Docker Hub (or other registry) account

---

## Step 1 — Build the Docker Image

From the project root:

```bash
cd apps/ml-service

# Standard CUDA build (downloads models at runtime)
docker build -t imagenix-ml-service .

# RunPod optimised build (pre-downloads all model weights)
docker build -f Dockerfile.runpod -t imagenix-ml-runpod .
```

> **Tip:** The RunPod image is ~15 GB because it bakes in all model weights.
> This eliminates download time on pod startup (saves 5–10 minutes).

---

## Step 2 — Push to Docker Hub

```bash
# Tag for your registry
docker tag imagenix-ml-runpod YOUR_DOCKERHUB_USERNAME/imagenix-ml-runpod:latest

# Push
docker push YOUR_DOCKERHUB_USERNAME/imagenix-ml-runpod:latest
```

---

## Step 3 — Deploy on RunPod

### 3a — Create a GPU Pod

1. Go to [RunPod Console](https://www.runpod.io/console/pods)
2. Click **Deploy**
3. Select a GPU:
   - **RTX 4090** (24 GB VRAM) — recommended for production
   - **RTX 3090** (24 GB VRAM) — good balance of cost/performance
   - **A100** (40/80 GB VRAM) — for heavy workloads
4. Under **Template**, select **Custom Docker Image**
5. Set image: `YOUR_DOCKERHUB_USERNAME/imagenix-ml-runpod:latest`
6. Set **Exposed HTTP Port**: `8000`
7. Set **Volume** (optional): `/tmp/models` — mount a persistent volume to cache models
8. Click **Deploy**

### 3b — Environment Variables (Optional Overrides)

| Variable | Default | Description |
|---|---|---|
| `ML_HOST` | `0.0.0.0` | Bind address |
| `ML_PORT` | `8000` | Service port |
| `PRELOAD_MODELS` | `true` | Load models on startup |
| `MODEL_CACHE_DIR` | `/tmp/models` | Model weight cache |
| `CONTROLNET_SCALE` | `0.95` | ControlNet conditioning strength |
| `GUIDANCE_SCALE` | `7.0` | CFG scale |
| `NUM_INFERENCE_STEPS` | `30` | Denoising steps |
| `MIN_STRUCTURAL_SIMILARITY` | `0.7` | Hallucination threshold |

---

## Step 4 — Connect the NestJS Backend

Once the RunPod pod is running, note the **Proxy URL** (e.g. `https://xyz-8000.proxy.runpod.net`).

Update your `.env`:

```env
FEATURE_GENERATIVE_AUGMENTATION=true
GENERATIVE_PROVIDER=runpod
ML_SERVICE_URL=https://xyz-8000.proxy.runpod.net
```

### Verify the Connection

```bash
# Health check
curl https://xyz-8000.proxy.runpod.net/health

# Expected response:
# {"status":"healthy","device":"cuda","models_loaded":true,"available_pipelines":["canny","depth","hed","canny_depth"]}
```

---

## Step 5 — Test Generation

From the project root:

```bash
# Single test generation
npx ts-node scripts/test-generation.ts path/to/test-image.jpg

# Full demo (5 variations)
npx ts-node scripts/demo-teacher.ts path/to/test-image.jpg
```

---

## Monitoring & Troubleshooting

### Check Pod Logs

In RunPod Console → your pod → **Logs** tab.

### Common Issues

| Issue | Solution |
|---|---|
| `503 Pipeline not loaded` | Models are still loading. Wait 2–3 minutes after startup. |
| `CUDA out of memory` | Use a GPU with more VRAM, or reduce `output_size`. |
| `Connection refused` | Ensure the pod is running and port 8000 is exposed. |
| Low similarity scores | Increase `CONTROLNET_SCALE` (e.g. to 1.0) for stricter structure. |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/v1/generate/controlnet-canny` | Single ControlNet (Canny) |
| `POST` | `/api/v1/generate/dual-control` | Dual ControlNet (Canny + Depth) |
| `POST` | `/api/v1/generate/safe-augmentation` | Preset prompt templates |
| `POST` | `/api/v1/validate/hallucination-check` | Structural similarity validation |
| `POST` | `/models/load` | Trigger manual model loading |

---

## Cost Estimates

| GPU | Hourly Cost | Generation Time |
|---|---|---|
| RTX 3090 | ~$0.35/hr | ~8–12s per image |
| RTX 4090 | ~$0.55/hr | ~5–8s per image |
| A100 40GB | ~$1.10/hr | ~3–5s per image |

---

## Security Notes

- The ML service does **not** implement authentication. Secure it via:
  - RunPod's built-in proxy authentication
  - A VPN / private network
  - An API key header (add to `main.py` if needed)
- Never expose the ML service directly to the public internet without auth.

---

## Local Development

For development without a GPU:

```bash
cd apps/ml-service

# Install dependencies
pip install -r requirements.txt

# Start with models disabled (CPU mode, no pre-loading)
PRELOAD_MODELS=false python main.py
```

The service will start on `http://localhost:8000`. Generation endpoints will return 503 until models are loaded (call `POST /models/load` to trigger loading).
