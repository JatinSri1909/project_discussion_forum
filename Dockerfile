FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove development dependencies
RUN rm -rf node_modules && \
    npm ci --only=production

EXPOSE 3000

CMD ["node", "dist/index.js"]