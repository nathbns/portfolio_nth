#!/bin/bash

echo "🚀 Démarrage du portfolio avec blog intégré"
echo ""

# Vérifier si Go est installé
if ! command -v go &> /dev/null; then
    echo "❌ Go n'est pas installé. Veuillez installer Go depuis https://golang.org/"
    exit 1
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "1️⃣ Démarrage du service Go (blog fetcher)..."
cd go-blog-fetcher

# Installer les dépendances Go
go mod tidy

# Démarrer le service Go en arrière-plan
go run main.go &
GO_PID=$!

echo "✅ Service Go démarré (PID: $GO_PID)"
echo "📚 API disponible sur http://localhost:8080/api/blog-posts"

# Attendre que le service Go soit prêt
sleep 3

cd ..

echo ""
echo "2️⃣ Démarrage de Next.js..."

# Installer les dépendances Node.js si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances Node.js..."
    npm install
fi

echo "🌐 Site disponible sur http://localhost:3000"
echo "📝 Blog disponible sur http://localhost:3000/blog"
echo ""
echo "Pour arrêter les services, utilisez Ctrl+C"
echo ""

# Fonction pour nettoyer les processus à l'arrêt
cleanup() {
    echo ""
    echo "🛑 Arrêt des services..."
    kill $GO_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer Next.js
npm run dev
