import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronica",
  description:
    "Personal time management based on Lyubishchev's time-statistics method.",
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
