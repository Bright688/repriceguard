import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepriceGuard — Glamsterdam Gas Repricing Scanner',
  description:
    'Scan Ethereum smart contracts for gas repricing vulnerabilities from the Glamsterdam upgrade.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
