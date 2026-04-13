# Use node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files (for caching)
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Copy remaining source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build the frontend (run this AFTER copying the source files!)
RUN cd frontend && npm run build

# Ensure necessary directories exist
RUN mkdir -p /app/backend/data && \
    mkdir -p /app/backend/uploads && \
    touch /app/backend/uploads/.gitkeep

# Expose backend port
EXPOSE 3001

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=./data/evua.db
ENV UPLOAD_DIR=./uploads

# Start application targeting the backend directory
WORKDIR /app/backend
CMD ["npm", "start"]
