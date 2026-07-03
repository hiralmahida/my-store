import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ConditionalChrome from "./components/ConditionalChrome";
import ToastProvider from "./components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FirstStop — Electronics Store (QAR)",
  description:
    "Qatar's destination for the latest electronics. Browse phones, laptops, tablets, TVs, appliances and accessories, priced in QAR.",
};

// The root layout wraps every page. We render the shared Header and Footer here
// once, and each page's content flows into <main>. `flex flex-col` + `flex-1`
// keeps the footer pinned to the bottom even on short pages.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <ToastProvider>
          <ConditionalChrome header={<Header />} footer={<Footer />}>
            {children}
          </ConditionalChrome>
        </ToastProvider>
      </body>
    </html>
  );
}
