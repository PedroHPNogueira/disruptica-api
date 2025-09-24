FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy source and build
COPY . .
RUN npx prisma generate && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only production files
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
