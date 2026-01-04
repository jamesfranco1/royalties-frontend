import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WalletProvider from "@/components/WalletProvider";
import { ToastProvider } from "@/components/Toast";
import PageTransition from "@/components/PageTransition";

const instrumentSans = Instrument_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "royalties.fun",
  description: "Buy and sell creator royalties on-chain. Creators raise capital. Investors trade future revenue.",
  icons: {
    icon: "/newlogo.jpg",
    shortcut: "/newlogo.jpg",
    apple: "/newlogo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSans.variable} ${ibmPlexMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        <WalletProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
