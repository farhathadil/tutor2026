'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.ok) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-mono text-xs tracking-widest text-gold-light opacity-70 uppercase mb-3">
            Grade 8 · Revision Platform
          </p>
          <h1 className="font-serif text-4xl font-bold text-white mb-2">
            Tutor <span className="text-gold-light">App</span>
          </h1>
          <p className="text-white/50 font-sans text-sm">Sign in to continue studying</p>
        </div>

        {/* Card */}
        <div className="bg-paper rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-xs tracking-wider text-ink-4 uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-rule rounded-lg bg-paper-2 text-ink font-sans text-sm
                           focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider text-ink-4 uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-rule rounded-lg bg-paper-2 text-ink font-sans text-sm
                           focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-crimson text-sm font-sans bg-crimson-light px-4 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper py-3 rounded-lg font-sans font-medium text-sm
                         hover:bg-ink-2 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-rule">
            <p className="font-mono text-xs text-ink-4 text-center mb-3">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-ink-3">
              <div className="bg-paper-2 rounded p-2">
                <div className="text-ink-2 font-medium">Admin</div>
                <div>admin@tutor.local</div>
                <div>admin123</div>
              </div>
              <div className="bg-cobalt-light rounded p-2">
                <div className="text-cobalt font-medium">Ahmed</div>
                <div>student1@tutor.local</div>
                <div>student123</div>
              </div>
              <div className="bg-teal-light rounded p-2">
                <div className="text-teal font-medium">Fuzail</div>
                <div>student2@tutor.local</div>
                <div>student123</div>
              </div>
              <div className="bg-paper-3 rounded p-2">
                <div className="text-ink-2 font-medium">Test</div>
                <div>test@tutor.local</div>
                <div>test123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
