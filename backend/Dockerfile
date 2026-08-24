FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose backend port
EXPOSE 7000

# Start backend server
CMD ["npm", "start"]
