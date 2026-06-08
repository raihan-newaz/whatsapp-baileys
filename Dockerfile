FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (keeping devDependencies for ts-node inside production)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build Next.js production files
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start Express + Next.js unified server
CMD ["npm", "start"]
