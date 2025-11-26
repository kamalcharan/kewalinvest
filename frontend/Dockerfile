# ============================================
# Stage 1: Build the React application
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

ENV OPENSSL_CONF=/dev/null

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --force

# Copy source code
COPY . .

# Build for production
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx (lightweight)
# ============================================
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]