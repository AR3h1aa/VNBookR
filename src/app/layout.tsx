import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mincho = Shippori_Mincho({
  variable: "--font-jp-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sakura Novels — Visual Novel Reader",
  description:
    "Import PDF / TXT / DOCX / EPUB books and read them as Japanese-style visual novels. Built with love for ADV / NVL / Frame UI conventions.",
  keywords: [
    "visual novel",
    "VN reader",
    "ADV",
    "NVL",
    "book reader",
    "Japanese VN",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoJP.variable} ${mincho.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
