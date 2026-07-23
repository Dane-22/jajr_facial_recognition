FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose backend API port
EXPOSE 5000

# Set node environment
ENV NODE_ENV=production

# Start application server
CMD ["node", "server.js"]
