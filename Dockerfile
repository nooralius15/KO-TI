FROM node:22-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy app source
COPY . .

# Create images directory for uploads
RUN mkdir -p public/images

EXPOSE 3000

CMD ["node", "server.js"]
