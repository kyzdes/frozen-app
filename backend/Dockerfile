FROM node:20-alpine

WORKDIR /app

# Install dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files
RUN rm -rf src node_modules && \
    npm ci --only=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
