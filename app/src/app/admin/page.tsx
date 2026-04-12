import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function AdminOverview() {
  const db = getDb();

  const stats = {
    subjects: (db.prepare('SELECT COUNT(*) as n FROM subjects').get() as any).n,
    topics: (db.prepare('SELECT COUNT(*) as n FROM topics').get() as any).n,
    published: (db.prepare('SELECT COUNT(*) as n FROM topics WHERE is_published=1').get() as any).n,
    materials: (db.prepare('SELECT COUNT(*) as n FROM materials').get() as any).n,
    questions: (db.prepare('SELECT COUNT(*) as n FROM questions').get() as any).n,
    flashcards: (db.prepare('SELECT COUNT(*) as n FROM flashcards').get() as any).n,
  };

  const students = db.prepare(`
    SELECT u.id, u.display_name, u.role,
      (SELECT COUNT(*) FROM session_progress WHERE user_id = u.id) as topics_started,
      (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = u.id) as quiz_attempts,
      (SELECT AVG(score_pct) FROM quiz_attempts WHERE user_id = u.id) as avg_score
    FROM users u WHERE u.role IN ('student','test') ORDER BY u.display_name
  `).all() as any[];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-wider text-gold uppercase mb-1">Admin Panel</p>
        <h1 className="font-serif text-3xl font-bold text-ink">Overview</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10">
        {[
          { label: 'Subjects', val: stats.subjects },
          { label: 'Topics', val: stats.topics },
          { label: 'Published', val: stats.published },
          { label: 'Materials', val: stats.materials },
          { label: 'Questions', val: stats.questions },
          { label: 'Flashcards', val: stats.flashcards },
        ].map(s => (
          <div key={s.label} className="bg-paper-2 border border-rule rounded-xl p-4 text-center">
            <div className="font-serif text-2xl font-bold text-gold">{s.val}</div>
            <div className="font-mono text-xs text-ink-4 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Student progress */}
      <h2 className="font-serif text-xl font-semibold text-ink mb-4">Student Progress</h2>
      <div className="bg-paper-2 border border-rule rounded-xl overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="bg-ink">
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Student</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Role</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Topics Started</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Quiz Attempts</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any, i) => (
              <tr key={s.id} className={`border-t border-rule ${i % 2 === 1 ? 'bg-paper' : ''}`}>
                <td className="px-5 py-3 font-sans text-sm text-ink font-medium">{s.display_name}</td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-xs px-2 py-0.5 rounded uppercase ${s.role === 'test' ? 'bg-gold/10 text-gold' : 'bg-cobalt-light text-cobalt'}`}>{s.role}</span>
                </td>
                <td className="px-5 py-3 font-mono text-sm text-ink-3">{s.topics_started}</td>
                <td className="px-5 py-3 font-mono text-sm text-ink-3">{s.quiz_attempts}</td>
                <td className="px-5 py-3 font-mono text-sm text-ink-3">{s.avg_score ? Math.round(s.avg_score) + '%' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4">
        <Link href="/admin/subjects" className="bg-ink text-paper px-5 py-2.5 rounded-lg font-sans text-sm hover:bg-ink-2 transition-colors">
          Manage Content →
        </Link>
        <Link href="/admin/users" className="bg-paper-3 text-ink-2 px-5 py-2.5 rounded-lg font-sans text-sm hover:bg-rule transition-colors">
          Manage Users →
        </Link>
      </div>
    </div>
  );
}
