FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Environment Variables
ENV NETWORK=local \
    TEST="ALL" 

# Copy the rest of the application
COPY . .

# Use the runner script
CMD ["npx", "ts-node", "--files", "/app/src/services/RunTestsInContainer.ts"]