import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "./providers";

export const metadata: Metadata = {
  title: "CodiH Hub",
  description: "Stream and manage your videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
