# Dockerfile pour le service blog Go
FROM golang:1.21-alpine AS builder

# Installer git pour go-git
RUN apk add --no-cache git

WORKDIR /app

# Copier les fichiers de dépendances
COPY go.mod go.sum ./

# Télécharger les dépendances
RUN go mod download

# Copier le code source
COPY main.go ./

# Compiler l'application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o blog-fetcher main.go

# Image finale
FROM alpine:latest

# Installer git et ca-certificates pour HTTPS
RUN apk --no-cache add ca-certificates git

WORKDIR /root/

# Copier l'exécutable
COPY --from=builder /app/blog-fetcher .

# Exposer le port
EXPOSE 8080

# Variables d'environnement
ENV PORT=8080
ENV GIN_MODE=release

# Commande de démarrage
CMD ["./blog-fetcher"]
