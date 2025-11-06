# Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment variable to avoid OpenSSL issues
ENV OPENSSL_CONF=/dev/null

# Set production environment
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps and force
RUN npm install --legacy-peer-deps --force

# Install serve globally for serving the production build
RUN npm install -g serve

# Copy all files
COPY . .

# Build the production application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application using serve (lightweight static server)
CMD ["serve", "-s", "build", "-l", "3000"]