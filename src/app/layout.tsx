import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EKD Digital Resource Hub",
  description:
    "Central hub for EKD Digital tools, converters, and research-ready utilities.",
  keywords: [
    "EKD Digital",
    "Resource Hub",
    "Reference Converter",
    "BibTeX",
    "Research Tools",
  ],
  metadataBase: new URL("https://rhub.ekddigital.com"),
  icons: {
    icon: "/rhub_logo.svg",
    apple: "/rhub_logo.png",
  },
  openGraph: {
    title: "EKD Digital Resource Hub",
    description:
      "Explore EKD Digital utilities: reference converters, LaTeX kits, and more.",
    type: "website",
    url: "https://rhub.ekddigital.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "EKD Digital Resource Hub",
    description:
      "Modular toolkit covering reference conversion, metadata QA, and more.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
