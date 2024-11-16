# Use Node.js LTS
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Add zlib-dev package before yarn install
RUN apk add --no-cache zlib-dev build-base gcc autoconf automake libtool

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the Next.js app
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]