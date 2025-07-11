FROM node:18-alpine
WORKDIR /app

# Copy package definitions, install deps
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy all code
COPY . .

# Run the validator
CMD ["node","index.js"]
