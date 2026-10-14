import type { Metadata } from "next";
import { STIX_Two_Text, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import Keys from "@/components/Keys";
import { site } from "@/lib/site";
import "./globals.css";

const stix = STIX_Two_Text({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-stix",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${stix.variable} ${geistMono.variable}`}>
      <body className={`${stix.className} min-h-screen antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Keys />
        </ThemeProvider>
      </body>
    </html>
  );
}
