FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy pre-built dist and source
COPY dist/ ./dist/
COPY server/ ./server/
COPY shared/ ./shared/

# Expose port
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Start directly - no build needed
CMD ["node", "dist/index.cjs"]
