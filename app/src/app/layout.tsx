import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ISMSgo',
  description: 'Personalised revision platform for Grade 8 students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
