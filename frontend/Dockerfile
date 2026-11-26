# Étape 1 : build Angular en mode production
FROM node:22-alpine AS build
WORKDIR /app
# Cypress n'est pas utile pour construire l'application
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# Étape 2 : Nginx sert l'application et relaie /api vers le back-end
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/datashare/browser /usr/share/nginx/html
EXPOSE 80
