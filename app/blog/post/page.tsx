import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface BlogPost {
  title: string;
  date: string;
  path: string;
  category: string;
  content: string;
}

interface PageProps {
  searchParams: Promise<{ path?: string }>;
}

async function fetchBlogPost(path: string): Promise<BlogPost | null> {
  try {
    // Lire le fichier JSON statique et trouver l'article correspondant
    const response = await fetch('/data/blog-posts.json', {
      cache: 'no-cache',
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const posts: BlogPost[] = await response.json();
    const post = posts.find(p => p.path === path);
    
    return post || null;
  } catch (error) {
    console.error('Erreur lors du chargement de l\'article:', error);
    return null;
  }
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-gray-900 prose-pre:text-gray-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mt-12 mb-8 text-foreground border-b border-foreground/30 pb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mt-10 mb-6 text-foreground border-b border-foreground/20 pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-8 mb-4 text-foreground border-b border-foreground/10 pb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-foreground/90">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 my-4 space-y-2">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-foreground/90 leading-relaxed">
              {children}
            </li>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-foreground/10 px-2 py-1 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              );
            }
            return (
              <code className={className}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 border">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline decoration-1 underline-offset-4 hover:decoration-2 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-6 border border-foreground/10"
            />
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-foreground/10 rounded w-3/4 mb-4"></div>
      <div className="flex gap-4 mb-6">
        <div className="h-4 bg-foreground/10 rounded w-20"></div>
        <div className="h-4 bg-foreground/10 rounded w-24"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-foreground/10 rounded w-full"></div>
        <div className="h-4 bg-foreground/10 rounded w-full"></div>
        <div className="h-4 bg-foreground/10 rounded w-3/4"></div>
        <div className="h-4 bg-foreground/10 rounded w-full"></div>
        <div className="h-4 bg-foreground/10 rounded w-2/3"></div>
      </div>
    </div>
  );
}

async function BlogPostContent({ path }: { path: string }) {
  const post = await fetchBlogPost(path);

  if (!post) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Article not found</h1>
        <p className="text-foreground/60 mb-4">
          The requested article does not exist or could not be loaded.
        </p>
        <Link 
          href="/blog" 
          className="text-foreground/80 hover:text-foreground transition-colors underline decoration-1 underline-offset-4"
        >
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4 text-sm text-foreground/60">
          <span className="bg-foreground/5 px-2 py-1 rounded">
            {post.category}
          </span>
          <time dateTime={post.date}>{post.date}</time>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          {post.title}
        </h1>
      </header>
      
      <div className="prose prose-lg max-w-none">
        <MarkdownRenderer content={post.content} />
      </div>
      
      <footer className="mt-12 pt-8 border-t border-foreground/10">
        <div className="flex items-center justify-between text-sm text-foreground/60">
          <span>Chemin: {post.path}</span>
          <span>Dernière mise à jour: {post.date}</span>
        </div>
      </footer>
    </article>
  );
}

export default async function BlogPostPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const path = resolvedParams.path;

  if (!path) {
    notFound();
  }

  return (
    <div className="pb-16 px-4 mx-auto max-w-4xl">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/blog" 
            className="text-foreground/60 hover:text-foreground transition-colors text-sm underline decoration-1 underline-offset-4"
          >
            ← Back to blog
          </Link>
        </div>
      </header>
      
      <main>
        <Suspense fallback={<LoadingSkeleton />}>
          <BlogPostContent path={path} />
        </Suspense>
      </main>
    </div>
  );
}
