import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUserId } from "@/lib/current-user";
import { Nav } from "@/components/Nav";

// Every page reads live data on every request; nothing here is safe to
// prerender at build time (there's no database available then). Without
// NextAuth's cookies()/headers() calls implicitly forcing this, Next has no
// other signal that the app can't be statically generated.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lifting Log",
  description: "Olympic lifting workout tracker",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const userId = await getCurrentUserId();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {userId && <Nav />}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
