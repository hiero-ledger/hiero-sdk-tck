FROM node:22-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

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