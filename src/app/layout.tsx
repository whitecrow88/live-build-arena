import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "StreamCoder.live — AI Apps Built Live on Stream",
    template: "%s | StreamCoder.live",
  },
  description:
    "Donate on Twitch or Kick with your app idea. Get a real AI-built prototype — GitHub repo + live Vercel preview — delivered in 15 minutes, live on stream.",
  keywords: [
    "live coding stream",
    "AI app builder",
    "Twitch coding",
    "Kick coding",
    "live build",
    "AI prototype",
    "stream coder",
    "build on stream",
  ],
  authors: [{ name: "StreamCoder.live" }],
  creator: "StreamCoder.live",
  metadataBase: new URL("https://streamcoder.live"),
  openGraph: {
    type: "website",
    url: "https://streamcoder.live",
    title: "StreamCoder.live — AI Apps Built Live on Stream",
    description:
      "Donate on Twitch or Kick with your app idea. Get a real AI-built prototype delivered in 15 minutes, live on stream.",
    siteName: "StreamCoder.live",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamCoder.live — AI Apps Built Live on Stream",
    description:
      "Donate on Twitch or Kick with your app idea. Get a real AI-built prototype delivered in 15 minutes, live on stream.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-arena-bg text-white antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#E5E7EB",
            },
          }}
        />
      </body>
    </html>
  );
}
