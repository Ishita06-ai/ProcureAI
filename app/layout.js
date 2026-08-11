import './globals.css';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata = {
  title: 'Procurio — AI Procurement & Vendor Intelligence',
  description: 'Enterprise procurement, vendor and inventory intelligence platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${hanken.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
