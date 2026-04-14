import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <aside className="w-56 bg-surface text-paper flex-shrink-0 flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-white/10">
          <p className="font-mono text-xs text-white/40 uppercase tracking-wider mb-1">Admin Panel</p>
          <p className="font-serif text-lg font-semibold text-white">Grade 8 <span className="text-gold-light">Tutor</span></p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: '/admin', label: 'Overview', icon: '📊' },
            { href: '/admin/subjects', label: 'Content', icon: '📚' },
            { href: '/admin/users', label: 'Users', icon: '👥' },
            { href: '/dashboard', label: 'Student View', icon: '🎓' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-sans"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="font-mono text-xs text-white/30">{session.user.name}</p>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
