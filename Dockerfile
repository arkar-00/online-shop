# ==============================================================================
# 1. DEVELOPMENT STAGE (Hot Reloading အတွက်)
# ==============================================================================
FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./

# Dev mode => full dependencies (including devDependencies)
RUN npm install

# App files ကို copy
COPY . .

# Expose port for local dev
EXPOSE 3000

# Dev mode => hot reload
CMD ["npm", "run", "start:dev"]


# ==============================================================================
# 2. BUILD STAGE (Build for production)
# ==============================================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Build NestJS to dist/
RUN npm run build


# ==============================================================================
# 3. PRODUCTION STAGE (Deploy-ready image)
# ==============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Only install production dependencies
COPY package*.json ./

# Copy dist from build stage
COPY --from=build /app/dist ./dist

# Expose app port
EXPOSE 3000

# Run production build
CMD npm run start:prod
