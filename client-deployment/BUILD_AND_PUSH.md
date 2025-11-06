# Build and Push Docker Images to Docker Hub

## Quick Commands (Copy & Paste)

```bash
# Login to Docker Hub (one time)
docker login

# Build backend image
docker build -f backend/Dockerfile.prod -t vikuna/kewalinvest-backend:latest ./backend

# Build frontend image
docker build -f frontend/Dockerfile.prod -t vikuna/kewalinvest-frontend:latest ./frontend

# Push both images
docker push vikuna/kewalinvest-backend:latest
docker push vikuna/kewalinvest-frontend:latest
```

## Verification

```bash
# Verify images exist locally
docker images | grep vikuna

# Test pulling images
docker pull vikuna/kewalinvest-backend:latest
docker pull vikuna/kewalinvest-frontend:latest
```

## Versioning (Optional)

To release a specific version:

```bash
# Tag with version number
docker tag vikuna/kewalinvest-backend:latest vikuna/kewalinvest-backend:v1.0.0
docker tag vikuna/kewalinvest-frontend:latest vikuna/kewalinvest-frontend:v1.0.0

# Push versioned tags
docker push vikuna/kewalinvest-backend:v1.0.0
docker push vikuna/kewalinvest-frontend:v1.0.0
```

Then customers can use specific versions in `.env`:
```env
IMAGE_TAG=v1.0.0
```

## Notes

- Images are built from **root directory** with context `./backend` and `./frontend`
- Production Dockerfiles: `backend/Dockerfile.prod` and `frontend/Dockerfile.prod`
- Registry: `vikuna` on Docker Hub
- After pushing, `./deploy.sh` will automatically pull these images
