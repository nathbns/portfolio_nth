import { Suspense } from 'react';
import Link from 'next/link';

interface BlogPost {
  title: string;
  date: string;
  path: string;
  category: string;
  content: string;
}

async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    // URL de l'API - utilise Railway en production, localhost en développement
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'https://portfolio-blog-production.up.railway.app'
      : 'http://localhost:8080';
    
    // Appel vers notre API Go pour récupérer les posts
    const response = await fetch(`${apiUrl}/api/blog-posts`, {
      cache: 'no-cache',
      next: { revalidate: 3600 } // Revalider toutes les heures
    });
    
    if (!response.ok) {
      throw new Error('Échec du chargement des articles');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des articles:', error);
    return [];
  }
}

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <article className="border border-foreground/10 rounded-lg p-4 hover:border-foreground/20 transition-colors duration-200">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between text-sm text-foreground/60">
          <span className="bg-foreground/5 px-2 py-1 rounded text-xs">
            {post.category}
          </span>
          <time dateTime={post.date}>{post.date}</time>
        </div>
        <h2 className="text-lg font-semibold text-foreground hover:text-foreground/80 transition-colors">
          <Link href={`/blog/post?path=${encodeURIComponent(post.path)}`} className="underline decoration-1 underline-offset-4 hover:decoration-2">
            {post.title}
          </Link>
        </h2>
        <p className="text-sm text-foreground/70 line-clamp-3">
          {post.content.substring(0, 150)}...
        </p>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border border-foreground/10 rounded-lg p-4">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-2">
              <div className="h-4 bg-foreground/10 rounded w-20"></div>
              <div className="h-4 bg-foreground/10 rounded w-24"></div>
            </div>
            <div className="h-6 bg-foreground/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-foreground/10 rounded w-full"></div>
            <div className="h-4 bg-foreground/10 rounded w-2/3 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function BlogContent() {
  const posts = await fetchBlogPosts();

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/60">Aucun article disponible pour le moment.</p>
        <p className="text-sm text-foreground/40 mt-2">
          Assurez-vous que le service Go est en cours d&apos;exécution.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <BlogPostCard key={`${post.path}-${index}`} post={post} />
      ))}
    </div>
  );
}

export default function BlogPage() {
  return (
    <div className="pb-16 px-4 mx-auto max-w-4xl">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/" 
            className="text-foreground/60 hover:text-foreground transition-colors text-sm underline decoration-1 underline-offset-4"
          >
            ← Back
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Blog - Today I Learned</h1>
        <p className="text-foreground/70">
          My daily learnings in computer science, machine learning and development.
        </p>
      </header>
      
      <main>
        <Suspense fallback={<LoadingSkeleton />}>
          <BlogContent />
        </Suspense>
      </main>
    </div>
  );
}
