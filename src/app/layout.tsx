import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RANZ Certified Business Portal",
  description:
    "Roofing Association of New Zealand - Certified Business Programme Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Skip ClerkProvider during build if no key is available
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html
      lang="en"
      style={
        {
          "--app-accent": "#2E7D32",
          "--app-accent-foreground": "#ffffff",
        } as React.CSSProperties
      }
    >
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );

  if (!hasClerkKey) {
    return content;
  }

  return (
    <ClerkProvider
      allowedRedirectOrigins={["https://reports.ranz.org.nz"]}
    >
      {content}
    </ClerkProvider>
  );
}
