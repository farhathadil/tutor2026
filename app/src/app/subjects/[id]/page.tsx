import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function SubjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const db = getDb();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(params.id) as any;
  if (!subject) notFound();

  const isAdmin = session.user.role === 'admin';
  const isTest = session.user.role === 'test';

  const sql = isAdmin || isTest
    ? 'SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order'
    : 'SELECT * FROM topics WHERE subject_id = ? AND is_published = 1 ORDER BY sort_order';
  const topics = db.prepare(sql).all(params.id) as any[];

  // Attach progress and stats
  const topicsWithData = topics.map(topic => {
    const progress = db.prepare(
      'SELECT * FROM session_progress WHERE user_id = ? AND topic_id = ?'
    ).get(session.user.id, topic.id) as any;

    const matCount = (db.prepare('SELECT COUNT(*) as n FROM materials WHERE topic_id = ?').get(topic.id) as any).n;
    const qCount = (db.prepare('SELECT COUNT(*) as n FROM questions WHERE topic_id = ?').get(topic.id) as any).n;
    const fcCount = (db.prepare('SELECT COUNT(*) as n FROM flashcards WHERE topic_id = ?').get(topic.id) as any).n;

    const completedStages: number[] = progress ? JSON.parse(progress.completed_stages) : [];
    const stars = completedStages.includes(5) ? 3 : completedStages.includes(4) ? 2 : completedStages.length > 0 ? 1 : 0;

    // Best quiz score
    const bestQuiz = db.prepare(
      'SELECT MAX(score_pct) as best FROM quiz_attempts WHERE user_id = ? AND topic_id = ?'
    ).get(session.user.id, topic.id) as any;

    return { ...topic, progress, completedStages, stars, matCount, qCount, fcCount, bestScore: bestQuiz?.best ?? null };
  });

  return (
    <div className="min-h-screen bg-paper">
      <nav className="bg-ink text-paper px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="font-mono text-xs text-white/50 hover:text-white transition-colors">← Back</Link>
        <span className="font-serif text-xl font-semibold text-white">
          Grade 8 <span className="text-gold-light">Tutor</span>
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Subject header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: subject.bg_color }}
          >
            {subject.icon}
          </div>
          <div>
            <p className="font-mono text-xs tracking-wider text-gold uppercase">{subject.code}</p>
            <h1 className="font-serif text-3xl font-bold text-ink">{subject.name}</h1>
            <p className="text-ink-3 text-sm font-sans">{topicsWithData.length} topic{topicsWithData.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Topics */}
        {topicsWithData.length === 0 ? (
          <div className="text-center py-16 text-ink-4 font-sans">
            <p className="text-4xl mb-3">📚</p>
            <p>No topics published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topicsWithData.map((topic, idx) => {
              const stagesFilled = topic.completedStages.length;
              const pct = Math.min(100, (stagesFilled / 5) * 100);
              const statusLabel = stagesFilled === 0 ? 'Not started' :
                topic.completedStages.includes(5) ? 'Complete' : 'In progress';
              const statusColor = stagesFilled === 0 ? 'text-ink-4' :
                topic.completedStages.includes(5) ? 'text-sage' : 'text-cobalt';

              return (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="block bg-paper-2 border border-rule rounded-xl p-5 hover:border-gold hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-paper-3 flex items-center justify-center font-mono text-xs text-ink-4 flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-sans font-semibold text-ink text-sm">{topic.title}</h3>
                          {topic.description && (
                            <p className="font-sans text-xs text-ink-3 mt-1 line-clamp-2">{topic.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[1,2,3].map(s => (
                            <span key={s} className={s <= topic.stars ? 'text-gold' : 'text-rule'}>★</span>
                          ))}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-mono text-ink-4 mb-1">
                          <span className={statusColor + ' font-medium'}>{statusLabel}</span>
                          <span>{stagesFilled}/5 stages</span>
                        </div>
                        <div className="w-full bg-paper-3 rounded-full h-1.5">
                          <div className="bg-gold h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="font-mono text-xs text-ink-4">{topic.matCount} materials</span>
                        <span className="font-mono text-xs text-ink-4">{topic.qCount} questions</span>
                        <span className="font-mono text-xs text-ink-4">{topic.fcCount} flashcards</span>
                        {topic.bestScore !== null && (
                          <span className="font-mono text-xs text-teal">Best: {topic.bestScore}%</span>
                        )}
                        {!topic.is_published && (
                          <span className="font-mono text-xs text-gold bg-gold/10 px-2 py-0.5 rounded">Draft</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
