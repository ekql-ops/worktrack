# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependencies resolve in their own layer, so a source-only change does not
# re-download the world on every rebuild.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- run ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Runs as a non-root user; nothing here needs to write outside /tmp.
RUN useradd --system --uid 10001 --shell /usr/sbin/nologin worktrack
USER worktrack

COPY --from=build /build/target/worktrack-api-*.jar app.jar

EXPOSE 8080
ENV JAVA_OPTS=""

# Respects the platform's assigned $PORT; Railway and Fly both set it.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
