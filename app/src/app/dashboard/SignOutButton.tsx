'use client';
import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors"
    >
      Sign out
    </button>
  );
}
