# ==============================================================================
# 1. DEVELOPMENT STAGE (optional, for local hot reload)
# ==============================================================================
FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./

# Install all dependencies (dev + prod)
RUN npm install

# Copy app source code
COPY . .

# Expose port for dev
EXPOSE 3000

# Dev command with hot reload
CMD ["npm", "run", "start:dev"]


# ==============================================================================
# 2. BUILD STAGE (compile NestJS for production)
# ==============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json and install all dependencies for build
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build NestJS app into dist/
RUN npm run build


# ==============================================================================
# 3. PRODUCTION STAGE
# ==============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Copy package.json and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled files from build stage
COPY --from=build /app/dist ./dist

# Expose app port
EXPOSE 3000

# Start the app (JSON array recommended)
CMD ["node", "dist/main.js"]
