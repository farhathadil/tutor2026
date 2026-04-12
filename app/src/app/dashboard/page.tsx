import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const db = getDb();
  const isAdmin = session.user.role === 'admin';

  const subjects = db.prepare('SELECT * FROM subjects ORDER BY sort_order').all() as any[];

  // For each subject get published topic count and user progress
  const subjectsWithData = subjects.map(sub => {
    const topics = db.prepare(
      `SELECT t.*, sp.current_stage, sp.completed_stages
       FROM topics t
       LEFT JOIN session_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       WHERE t.subject_id = ? AND t.is_published = 1
       ORDER BY t.sort_order`
    ).all(session.user.id, sub.id) as any[];

    const total = topics.length;
    const started = topics.filter((t: any) => t.current_stage !== null).length;
    const completed = topics.filter((t: any) => {
      if (!t.completed_stages) return false;
      const stages = JSON.parse(t.completed_stages);
      return stages.includes(5);
    }).length;

    return { ...sub, total, started, completed };
  });

  // Admin stats
  let adminStats = null;
  if (isAdmin) {
    const totalTopics = db.prepare('SELECT COUNT(*) as n FROM topics').get() as any;
    const totalMaterials = db.prepare('SELECT COUNT(*) as n FROM materials').get() as any;
    const totalQuestions = db.prepare('SELECT COUNT(*) as n FROM questions').get() as any;
    const totalFlashcards = db.prepare('SELECT COUNT(*) as n FROM flashcards').get() as any;
    const students = db.prepare(`SELECT id, display_name FROM users WHERE role IN ('student','test')`).all() as any[];
    const studentProgress = students.map((s: any) => {
      const completed = db.prepare(
        `SELECT COUNT(*) as n FROM session_progress WHERE user_id = ? AND completed_stages LIKE '%5%'`
      ).get(s.id) as any;
      return { ...s, completed: completed.n };
    });
    adminStats = { totalTopics: totalTopics.n, totalMaterials: totalMaterials.n, totalQuestions: totalQuestions.n, totalFlashcards: totalFlashcards.n, studentProgress };
  }

  // Streak calculation
  const recentDays = db.prepare(
    `SELECT DISTINCT date(last_active_at) as d FROM session_progress
     WHERE user_id = ? ORDER BY d DESC LIMIT 30`
  ).all(session.user.id) as any[];
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < recentDays.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (recentDays[i].d === expected) streak++;
    else break;
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <nav className="bg-ink text-paper px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <span className="font-serif text-xl font-semibold text-white">
            Grade 8 <span className="text-gold-light">Tutor</span>
          </span>
          <div className="hidden md:flex gap-4 text-sm font-sans">
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors">Dashboard</Link>
            {isAdmin && <Link href="/admin" className="text-gold-light hover:text-gold transition-colors">Admin Panel</Link>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-sans text-sm text-white/60">{session.user.name}</span>
          {streak > 0 && (
            <span className="font-mono text-xs bg-gold/20 text-gold-light px-2 py-1 rounded">🔥 {streak}</span>
          )}
          <SignOutButton />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-xs tracking-wider text-gold uppercase mb-1">Welcome back</p>
          <h1 className="font-serif text-3xl font-bold text-ink">{session.user.name}</h1>
          <p className="text-ink-3 text-sm mt-1 font-sans">
            {isAdmin ? 'Admin Dashboard — manage content and view student progress' : 'Pick up where you left off'}
          </p>
        </div>

        {/* Admin Stats */}
        {isAdmin && adminStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Topics', val: adminStats.totalTopics },
              { label: 'Materials', val: adminStats.totalMaterials },
              { label: 'Questions', val: adminStats.totalQuestions },
              { label: 'Flashcards', val: adminStats.totalFlashcards },
            ].map(s => (
              <div key={s.label} className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
                <div className="font-serif text-3xl font-bold text-gold">{s.val}</div>
                <div className="font-mono text-xs text-ink-4 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Admin Student Progress */}
        {isAdmin && adminStats && (
          <div className="mb-8 bg-paper-2 border border-rule rounded-xl p-5">
            <h2 className="font-serif text-lg font-semibold text-ink mb-4">Student Progress</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {adminStats.studentProgress.map((s: any) => (
                <div key={s.id} className="bg-paper border border-rule rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-cobalt-light text-cobalt flex items-center justify-center font-semibold text-sm">
                    {s.display_name[0]}
                  </div>
                  <div>
                    <div className="font-sans text-sm font-medium text-ink">{s.display_name}</div>
                    <div className="font-mono text-xs text-ink-4">{s.completed} topics completed</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/admin" className="text-sm font-sans text-gold hover:text-ink transition-colors">
                Go to Admin Panel →
              </Link>
            </div>
          </div>
        )}

        {/* Subjects Grid */}
        <h2 className="font-serif text-xl font-semibold text-ink mb-4">Subjects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectsWithData.map(sub => (
            <Link
              key={sub.id}
              href={`/subjects/${sub.id}`}
              className="block bg-paper-2 border border-rule rounded-xl p-5 hover:border-gold hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: sub.bg_color }}
                >
                  {sub.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-ink text-sm mb-0.5">{sub.name}</div>
                  <div className="font-mono text-xs text-ink-4">{sub.code} · {sub.total} topics</div>
                  {sub.total > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs font-mono text-ink-4 mb-1">
                        <span>{sub.completed}/{sub.total} done</span>
                        <span>{Math.round((sub.completed / sub.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-paper-3 rounded-full h-1.5">
                        <div
                          className="bg-gold h-1.5 rounded-full transition-all"
                          style={{ width: `${sub.total ? (sub.completed / sub.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {sub.total === 0 && (
                    <div className="mt-2 text-xs text-ink-4 font-sans italic">No topics yet</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
