FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY backend/ .
COPY frontend/public/models/ /app/models/

ENV FACE_MODEL_DIR=/app/models

# Expose backend port
EXPOSE 7000

# Start backend server
CMD ["npm", "start"]
