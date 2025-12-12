FROM node:20-alpine

WORKDIR /app

# cache deps
COPY package.json package-lock.json* ./
RUN npm install

# copy source
COPY . .

EXPOSE 5173