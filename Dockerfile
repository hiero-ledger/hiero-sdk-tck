FROM node:25-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370

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

RUN chown -R node:node /app
USER node

# Use the runner script
CMD ["npx", "ts-node", "--files", "/app/src/services/RunTestsInContainer.ts"]