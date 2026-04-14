'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-paper-2 border border-rule shadow-lg flex items-center justify-center text-base hover:border-gold transition-all"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
