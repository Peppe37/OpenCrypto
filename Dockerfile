# Stage 1: Build (uguale a prima)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# --- AGGIUNGI QUESTA RIGA FONDAMENTALE ---
RUN chmod -R 755 /usr/share/nginx/html
# -----------------------------------------

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
