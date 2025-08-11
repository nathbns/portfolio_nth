import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import { BGPattern } from "@/components/ui/bg-pattern";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <BGPattern variant="grid" mask="fade-edges" className="opacity-40" />
        <main className="flex-1 pt-4 sm:pt-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
