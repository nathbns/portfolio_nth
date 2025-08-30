# Blog Integration - Today I Learned

Ce projet intègre un blog qui récupère automatiquement les articles markdown depuis le dépôt GitHub [nathbns/til](https://github.com/nathbns/til).

## Architecture

- **Frontend**: Next.js avec TypeScript et Tailwind CSS
- **Backend**: Service Go qui clone/synchronise le dépôt TIL et expose une API REST
- **Source**: Dépôt GitHub nathbns/til avec les fichiers markdown

## Fonctionnalités

✅ **Bouton blog simple** avec style souligné sur la page d'accueil  
✅ **Service Go** pour récupérer les fichiers markdown depuis GitHub  
✅ **Page blog** avec liste des articles  
✅ **Pages individuelles** pour chaque article  
✅ **Rendu markdown** basique intégré  
✅ **Synchronisation automatique** du dépôt à chaque requête  
✅ **Catégorisation** basée sur la structure des dossiers  
✅ **Tri par date** (plus récents en premier)  

## Démarrage rapide

### 1. Démarrer le service Go

```bash
cd go-blog-fetcher
chmod +x start.sh
./start.sh
```

Le service sera disponible sur `http://localhost:8080`

### 2. Démarrer Next.js

```bash
npm run dev
```

Le site sera disponible sur `http://localhost:3000`

### 3. Accéder au blog

- Page d'accueil: `http://localhost:3000`
- Blog: `http://localhost:3000/blog`
- API: `http://localhost:8080/api/blog-posts`

## API Endpoints

- `GET /api/blog-posts` - Liste tous les articles
- `GET /api/blog-posts/{path}` - Récupère un article spécifique
- `GET /health` - Health check

## Structure des données

Chaque article contient:
- **title**: Titre extrait du markdown ou nom du fichier
- **date**: Date du dernier commit ou modification du fichier
- **path**: Chemin relatif dans le dépôt
- **category**: Dossier parent (ex: "machine_learning/llm")
- **content**: Contenu markdown complet

## Personnalisation

### Style du bouton blog
Le bouton est stylé avec Tailwind CSS dans `/app/page.tsx`:
```tsx
<a href="/blog" className="text-foreground/80 hover:text-foreground transition-colors duration-200 text-sm sm:text-base underline decoration-1 underline-offset-4 hover:decoration-2">
  Blog - Today I Learned
</a>
```

### Configuration du service Go
Dans `/go-blog-fetcher/main.go`, vous pouvez modifier:
- `repoURL`: URL du dépôt GitHub
- `localPath`: Dossier local pour le clone
- `port`: Port du service (défaut: 8080)

## Dépendances

### Go
- `github.com/go-git/go-git/v5` - Manipulation Git
- `github.com/gorilla/mux` - Routeur HTTP
- `github.com/gorilla/handlers` - Middleware HTTP

### Next.js
Utilise les dépendances existantes du projet portfolio.

## Notes techniques

- Le service Go clone le dépôt au premier démarrage puis effectue des `git pull` à chaque requête
- Les fichiers `.md` cachés et `README.md` sont ignorés
- Le rendu markdown est basique et peut être amélioré avec une bibliothèque dédiée
- CORS est configuré pour permettre les requêtes depuis localhost:3000
