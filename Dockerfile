# Stage 1: Build the Next.js application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to leverage Docker cache
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN yarn build

# Stage 2: Create the production-ready image
FROM node:22-alpine

# Set environment variables for Next.js production mode
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Copy the seed database to a SEPARATE location that won't be shadowed
# by the volume mount on /app/data. The entrypoint script copies it
# into /app/data on first run if the volume is empty.
COPY --from=builder /app/data ./data-seed

# Create the data directory (will be the volume mount point)
RUN mkdir -p /app/data

# Copy and set up the entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["yarn", "start"]
