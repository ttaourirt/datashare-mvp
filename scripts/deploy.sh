#!/usr/bin/env bash
# Déploiement de DataShare avec Docker : PostgreSQL + back-end + front-end (Nginx).
#   ./scripts/deploy.sh        construit les images et démarre tout
#   ./scripts/deploy.sh stop   arrête tout (les données restent dans les volumes)
set -e
cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

if [ "$1" = "stop" ]; then
  $DC --profile app down
  exit 0
fi

# 1. Configuration : on crée .env une seule fois, avec un secret JWT aléatoire
if [ ! -f .env ]; then
  cp .env.example .env
  secret=$(openssl rand -base64 48 | tr -d '\n')
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" .env && rm .env.bak
  echo "Fichier .env créé (secret JWT généré)."
fi

# Un conteneur datashare-db créé à la main (docker run) bloquerait docker compose
if docker ps -a --format '{{.Names}}' | grep -qx datashare-db \
   && [ -z "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' datashare-db)" ]; then
  echo "Le conteneur datashare-db existe déjà mais n'a pas été créé par docker compose."
  echo "Supprime-le avec : docker rm -f datashare-db"
  echo "(les données restent dans le volume datashare-db-data), puis relance ce script."
  exit 1
fi

# 2. Construction des images et démarrage
# Au démarrage du back-end, Flyway crée ou met à jour les tables.
$DC --profile app up -d --build

# 3. On attend que le back-end réponde
echo "Démarrage du back-end..."
for i in $(seq 1 60); do
  if curl -fs http://localhost:8080/actuator/health >/dev/null; then
    echo "DataShare est en ligne : http://localhost:4200 (API : http://localhost:8080)"
    exit 0
  fi
  sleep 2
done
echo "Le back-end ne répond pas. Voir les logs : $DC logs backend"
exit 1
