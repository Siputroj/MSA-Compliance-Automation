import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSA Compliance Automation Dashboard",
  description: "Automated Master Service Agreement (MSA) legal clause auditor using local hardware-accelerated LLM retrieval-augmented generation (RAG).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
