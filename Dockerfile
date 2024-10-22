# Build stage
FROM node:20-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS production

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Set ownership of the application files
RUN chown -R expressjs:nodejs .

# Switch to non-root user
USER expressjs

# Set production environment
ENV NODE_ENV production
ENV PORT 3002

# Expose the port
EXPOSE 3002

# Start the application
CMD [ "node", "dist/server.js" ]