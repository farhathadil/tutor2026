import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grade 8 Tutor',
  description: 'Personalised revision platform for Grade 8 students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
