FROM node:26-slim@sha256:193fe51b64e77981119c98c2002c9e32a70e2f006fb4d25068ce0558998917f0

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