#!/usr/bin/env bash
# Installation de l'environnement de développement DataShare.
#  1. vérifie les outils (Docker, Java 21, Node)
#  2. démarre PostgreSQL et attend qu'il soit prêt
#  3. installe les dépendances du front
# Les tables sont créées par Flyway au premier lancement du back-end.
set -e
cd "$(dirname "$0")/.."

echo "1/3 Vérification des outils"
command -v docker >/dev/null || { echo "Docker est introuvable."; exit 1; }
command -v node >/dev/null || { echo "Node.js est introuvable (version 22.22+ ou 24.15+)."; exit 1; }
if [ -z "$JAVA_HOME" ] && ! java -version >/dev/null 2>&1; then
  echo "Java 21 est introuvable : installe-le puis définis JAVA_HOME."
  exit 1
fi
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

echo "2/3 Démarrage de PostgreSQL"
if docker ps -a --format '{{.Names}}' | grep -qx datashare-db; then
  docker start datashare-db >/dev/null   # conteneur déjà créé auparavant
else
  $DC up -d postgres
fi
until [ "$(docker inspect -f '{{.State.Health.Status}}' datashare-db 2>/dev/null)" = "healthy" ] \
   || docker exec datashare-db pg_isready -q 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL est prêt sur localhost:5432"

echo "3/3 Dépendances du front"
(cd frontend && npm install)

echo
echo "Installation terminée. Pour lancer l'application :"
echo "  cd backend && ./mvnw spring-boot:run   # API sur http://localhost:8080"
echo "  cd frontend && npm start               # application sur http://localhost:4200"
