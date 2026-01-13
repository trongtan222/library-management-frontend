# Stage 1: Build Angular
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm with better timeout settings
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000

# Install dependencies (npm ci is faster and more reliable than npm install)
RUN npm ci --legacy-peer-deps --verbose

# Copy source code
COPY . .

# Build for production
RUN npm run build --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built Angular app
COPY --from=build /app/dist/lms-frontend .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]