# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (using npm install for flexibility)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Create UserFiles directory
RUN mkdir -p /app/UserFiles

# Expose port
EXPOSE 8080

# Start the application in production mode
CMD ["npm", "start"]