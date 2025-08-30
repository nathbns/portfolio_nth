package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
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
		fmt.Printf("📥 Clonage du dépôt %s...\n", gf.repoURL)
		_, err := git.PlainClone(gf.localPath, false, &git.CloneOptions{
			URL:      gf.repoURL,
			Progress: os.Stdout,
		})
		return err
	} else {
		// Le dépôt existe, faire un pull
		fmt.Printf("🔄 Mise à jour du dépôt...\n")
		repo, err := git.PlainOpen(gf.localPath)
		if err != nil {
			return err
		}

		workTree, err := repo.Worktree()
		if err != nil {
			return err
		}

		err = workTree.Pull(&git.PullOptions{
			RemoteName: "origin",
		})
		if err != nil && err.Error() != "already up-to-date" {
			return err
		}
		return nil
	}
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
	}
	
	// Si aucun titre trouvé, extraire intelligemment depuis la première ligne
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "```") {
			continue
		}
		
		// Prendre la première phrase jusqu'au point ou 50 caractères max
		if len(line) > 0 {
			if idx := strings.Index(line, "."); idx > 0 && idx < 100 {
				return strings.TrimSpace(line[:idx])
			}
			if len(line) > 50 {
				return strings.TrimSpace(line[:50]) + "..."
			}
			return line
		}
	}
	
	return ""
}

func (gf *GitHubFetcher) getFileDate(filePath string) string {
	// Essayer d'obtenir la date depuis Git
	repo, err := git.PlainOpen(gf.localPath)
	if err == nil {
		commits, err := repo.Log(&git.LogOptions{
			FileName: &filePath,
		})
		if err == nil {
			commit, err := commits.Next()
			if err == nil {
				return commit.Author.When.Format("2006-01-02")
			}
		}
	}
	
	// Fallback sur la date de modification du fichier
	if info, err := os.Stat(filepath.Join(gf.localPath, filePath)); err == nil {
		return info.ModTime().Format("2006-01-02")
	}
	
	return time.Now().Format("2006-01-02")
}

func (gf *GitHubFetcher) GetBlogPosts() ([]BlogPost, error) {
	err := gf.CloneOrPullRepo()
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la synchronisation du dépôt: %v", err)
	}

	var posts []BlogPost

	err = filepath.Walk(gf.localPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Ignorer les fichiers qui ne sont pas des markdown ou dans des dossiers cachés
		if !strings.HasSuffix(path, ".md") || strings.Contains(path, "/.") {
			return nil
		}

		// Obtenir le chemin relatif
		relPath, err := filepath.Rel(gf.localPath, path)
		if err != nil {
			return err
		}

		// Ignorer README.md à la racine
		if relPath == "README.md" {
			return nil
		}

		// Lire le contenu du fichier
		content, err := ioutil.ReadFile(path)
		if err != nil {
			return err
		}

		// Extraire les informations
		title := gf.extractTitle(string(content))
		if title == "" {
			// Utiliser le nom du fichier sans extension
			title = strings.TrimSuffix(filepath.Base(relPath), ".md")
			title = strings.ReplaceAll(title, "_", " ")
			title = strings.Title(title)
		}

		category := filepath.Dir(relPath)
		if category == "." {
			category = "general"
		}

		date := gf.getFileDate(relPath)

		posts = append(posts, BlogPost{
			Title:    title,
			Date:     date,
			Path:     relPath,
			Category: category,
			Content:  string(content),
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Trier par date (plus récent en premier)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}

func main() {
	fmt.Println("🚀 Récupération des articles TIL...")
	
	// Créer le fetcher
	fetcher := NewGitHubFetcher("https://github.com/nathbns/til.git", "./til-repo")
	
	// Récupérer les articles
	posts, err := fetcher.GetBlogPosts()
	if err != nil {
		log.Fatalf("❌ Erreur: %v", err)
	}
	
	// Créer le dossier data s'il n'existe pas
	dataDir := "../public/data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatalf("❌ Erreur lors de la création du dossier data: %v", err)
	}
	
	// Sauvegarder en JSON
	jsonData, err := json.MarshalIndent(posts, "", "  ")
	if err != nil {
		log.Fatalf("❌ Erreur lors de la sérialisation JSON: %v", err)
	}
	
	outputFile := filepath.Join(dataDir, "blog-posts.json")
	if err := ioutil.WriteFile(outputFile, jsonData, 0644); err != nil {
		log.Fatalf("❌ Erreur lors de l'écriture du fichier: %v", err)
	}
	
	fmt.Printf("✅ %d articles récupérés et sauvegardés dans %s\n", len(posts), outputFile)
	
	// Afficher un aperçu
	if len(posts) > 0 {
		fmt.Println("\n📚 Aperçu des articles:")
		for i, post := range posts {
			if i >= 5 { // Afficher seulement les 5 premiers
				fmt.Printf("... et %d autres articles\n", len(posts)-5)
				break
			}
			fmt.Printf("  • %s (%s) - %s\n", post.Title, post.Category, post.Date)
		}
	}
}
