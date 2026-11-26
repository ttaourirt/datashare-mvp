# Étape 1 : compilation du jar avec Maven et Java 21
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
# Les tests tournent dans la CI, pas pendant la construction de l'image
RUN mvn -B -q package -DskipTests

# Étape 2 : image d'exécution, seulement le JRE et le jar
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Utilisateur sans droits root, propriétaire du dossier des fichiers envoyés
RUN useradd --system datashare && mkdir -p /app/storage/uploads && chown -R datashare /app/storage
USER datashare
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
