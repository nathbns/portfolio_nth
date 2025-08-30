#!/bin/bash

echo "🚀 Démarrage du service blog fetcher..."

# Vérifier si Go est installé
if ! command -v go &> /dev/null; then
    echo "❌ Go n'est pas installé. Veuillez installer Go depuis https://golang.org/"
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances Go..."
go mod tidy

# Démarrer le serveur
echo "🌐 Démarrage du serveur sur http://localhost:8080"
echo "📚 API disponible sur http://localhost:8080/api/blog-posts"
echo "❤️  Health check: http://localhost:8080/health"
echo ""
echo "Pour arrêter le serveur, utilisez Ctrl+C"
echo ""

go run main.go
