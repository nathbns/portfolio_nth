#!/bin/bash

echo "🚀 Mise à jour du blog TIL..."

# Aller dans le dossier scripts
cd "$(dirname "$0")"

# Installer les dépendances Go si nécessaire
if [ ! -f "go.sum" ]; then
    echo "📦 Installation des dépendances Go..."
    go mod tidy
fi

# Exécuter le script de récupération
echo "📥 Récupération des articles depuis GitHub..."
go run fetch-blog-posts.go

# Vérifier si le fichier a été créé
if [ -f "../public/data/blog-posts.json" ]; then
    echo "✅ Blog mis à jour avec succès !"
    echo "📄 Fichier généré: public/data/blog-posts.json"
    
    # Compter le nombre d'articles
    count=$(cat ../public/data/blog-posts.json | grep -o '"title"' | wc -l)
    echo "📚 Nombre d'articles: $count"
    
    echo ""
    echo "🎯 Prochaines étapes:"
    echo "  1. Vérifiez le contenu dans public/data/blog-posts.json"
    echo "  2. Testez votre site avec: npm run dev"
    echo "  3. Déployez avec: git add . && git commit -m 'update blog posts' && git push"
else
    echo "❌ Erreur: Le fichier blog-posts.json n'a pas été créé"
    exit 1
fi
