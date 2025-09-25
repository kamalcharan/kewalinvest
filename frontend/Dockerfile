# Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment variable to avoid OpenSSL issues
ENV OPENSSL_CONF=/dev/null

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps and force
RUN npm install --legacy-peer-deps --force

# Copy all files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]