# Backend Development Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Install global development tools
RUN npm install -g typescript nodemon

# Copy source code
COPY . .

# Create UserFiles directory
RUN mkdir -p /app/UserFiles

# Build TypeScript code (if build script exists)
RUN npm run build || echo "Build script not found, skipping..."

# Expose port
EXPOSE 8080

# Start the application in development mode
CMD ["npm", "run", "dev"]