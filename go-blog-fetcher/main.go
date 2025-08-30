package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-git/go-git/v5"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

type BlogPost struct {
	Title    string `json:"title"`
	Date     string `json:"date"`
	Path     string `json:"path"`
	Category string `json:"category"`
	Content  string `json:"content"`
}

type GitHubFetcher struct {
	repoURL   string
	localPath string
}

func NewGitHubFetcher(repoURL, localPath string) *GitHubFetcher {
	return &GitHubFetcher{
		repoURL:   repoURL,
		localPath: localPath,
	}
}

func (gf *GitHubFetcher) CloneOrPullRepo() error {
	// Vérifier si le dossier existe déjà
	if _, err := os.Stat(gf.localPath); os.IsNotExist(err) {
		// Cloner le dépôt
		log.Printf("Clonage du dépôt %s vers %s", gf.repoURL, gf.localPath)
		_, err := git.PlainClone(gf.localPath, false, &git.CloneOptions{
			URL:      gf.repoURL,
			Progress: os.Stdout,
		})
		return err
	} else {
		// Pull les dernières modifications
		log.Printf("Mise à jour du dépôt local %s", gf.localPath)
		repo, err := git.PlainOpen(gf.localPath)
		if err != nil {
			return err
		}

		worktree, err := repo.Worktree()
		if err != nil {
			return err
		}

		err = worktree.Pull(&git.PullOptions{
			RemoteName: "origin",
		})
		if err != nil && err != git.NoErrAlreadyUpToDate {
			return err
		}
	}
	return nil
}

func (gf *GitHubFetcher) FindMarkdownFiles() ([]BlogPost, error) {
	var posts []BlogPost

	err := filepath.Walk(gf.localPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Ignorer les fichiers cachés, README.md et les dossiers .git
		if strings.HasPrefix(info.Name(), ".") || info.Name() == "README.md" {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// md
		if !info.IsDir() && strings.HasSuffix(strings.ToLower(info.Name()), ".md") {
			post, err := gf.parseMarkdownFile(path)
			if err != nil {
				log.Printf("Erreur lors du traitement de %s: %v", path, err)
				return nil
			}
			posts = append(posts, post)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Trier les posts par date (plus récents en premier)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}

func (gf *GitHubFetcher) parseMarkdownFile(filePath string) (BlogPost, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return BlogPost{}, err
	}

	// Extraire le chemin relatif depuis le dossier du dépôt
	relPath, err := filepath.Rel(gf.localPath, filePath)
	if err != nil {
		return BlogPost{}, err
	}

	// Déterminer la catégorie basée sur le dossier parent
	category := filepath.Dir(relPath)
	if category == "." {
		category = "général"
	}

	// Extraire le titre depuis le contenu ou utiliser le nom du fichier
	title := gf.extractTitle(string(content))
	if title == "" {
		title = strings.TrimSuffix(filepath.Base(filePath), ".md")
	}

	// Obtenir la date de modification du fichier
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return BlogPost{}, err
	}

	// Essayer d'obtenir la date depuis Git si possible
	date := gf.getGitDate(filePath)
	if date == "" {
		date = fileInfo.ModTime().Format("2006-01-02")
	}

	post := BlogPost{
		Title:    title,
		Date:     date,
		Path:     relPath,
		Category: category,
		Content:  string(content),
	}

	return post, nil
}

func (gf *GitHubFetcher) extractTitle(content string) string {
	lines := strings.Split(content, "\n")

	// Chercher le premier titre H1 ou H2 dans les 10 premières lignes non-vides
	for i, line := range lines {
		if i >= 10 {
			break
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Éviter les lignes qui sont dans des blocs de code
		if strings.HasPrefix(line, "```") {
			break
		}

		// Chercher les titres markdown
		if strings.HasPrefix(line, "# ") {
			return strings.TrimSpace(line[2:])
		}
		if strings.HasPrefix(line, "## ") {
			return strings.TrimSpace(line[3:])
		}
		if strings.HasPrefix(line, "### ") {
			return strings.TrimSpace(line[4:])
		}

		// Si c'est la première ligne et qu'elle contient du texte descriptif,
		// essayer d'extraire un titre intelligent
		if i == 0 && len(line) > 10 && len(line) < 100 {
			// Éviter les commentaires
			if !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "//") {
				// Extraire jusqu'au premier point ou virgule
				if idx := strings.IndexAny(line, ".,"); idx > 0 && idx < 60 {
					return strings.TrimSpace(line[:idx])
				}
				// Sinon prendre toute la ligne si elle n'est pas trop longue
				if len(line) < 60 {
					return line
				}
			}
		}
	}

	return ""
}

func (gf *GitHubFetcher) getGitDate(filePath string) string {
	repo, err := git.PlainOpen(gf.localPath)
	if err != nil {
		return ""
	}

	// Obtenir l'historique des commits pour ce fichier
	commits, err := repo.Log(&git.LogOptions{
		FileName: &filePath,
	})
	if err != nil {
		return ""
	}

	// Prendre le premier commit (le plus récent)
	commit, err := commits.Next()
	if err != nil {
		return ""
	}

	return commit.Committer.When.Format("2006-01-02")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Configuration
	repoURL := "https://github.com/nathbns/til.git"
	localPath := "./til-repo"
	port := "8080"

	// Créer le fetcher
	fetcher := NewGitHubFetcher(repoURL, localPath)

	// Cloner ou mettre à jour le dépôt au démarrage
	if err := fetcher.CloneOrPullRepo(); err != nil {
		log.Fatalf("Erreur lors de la synchronisation du dépôt: %v", err)
	}

	// Configuration du routeur
	r := mux.NewRouter()

	// Route pour récupérer tous les articles
	r.HandleFunc("/api/blog-posts", func(w http.ResponseWriter, r *http.Request) {
		// Mettre à jour le dépôt avant de récupérer les articles
		if err := fetcher.CloneOrPullRepo(); err != nil {
			log.Printf("Erreur lors de la mise à jour du dépôt: %v", err)
		}

		posts, err := fetcher.FindMarkdownFiles()
		if err != nil {
			http.Error(w, fmt.Sprintf("Erreur lors de la récupération des articles: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(posts); err != nil {
			http.Error(w, fmt.Sprintf("Erreur lors de l'encodage JSON: %v", err), http.StatusInternalServerError)
			return
		}
	}).Methods("GET")

	// Route pour récupérer un article spécifique
	r.HandleFunc("/api/blog-posts/{path:.*}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		requestedPath := vars["path"]

		posts, err := fetcher.FindMarkdownFiles()
		if err != nil {
			http.Error(w, fmt.Sprintf("Erreur lors de la récupération des articles: %v", err), http.StatusInternalServerError)
			return
		}

		for _, post := range posts {
			if post.Path == requestedPath {
				w.Header().Set("Content-Type", "application/json")
				if err := json.NewEncoder(w).Encode(post); err != nil {
					http.Error(w, fmt.Sprintf("Erreur lors de l'encodage JSON: %v", err), http.StatusInternalServerError)
					return
				}
				return
			}
		}

		http.Error(w, "Article non trouvé", http.StatusNotFound)
	}).Methods("GET")

	// Route de santé
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "OK"})
	}).Methods("GET")

	// Appliquer le middleware CORS
	handler := corsMiddleware(r)
	handler = handlers.LoggingHandler(os.Stdout, handler)

	log.Printf("Serveur démarré sur le port %s", port)
	log.Printf("API disponible sur http://localhost:%s/api/blog-posts", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
