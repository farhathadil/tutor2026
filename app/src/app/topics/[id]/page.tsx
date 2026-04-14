import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import Link from 'next/link';

const STAGES = [
  { n: 1, icon: '🎬', label: 'Introduce', desc: 'Slides & audio', types: ['slide', 'audio'] },
  { n: 2, icon: '🗺️', label: 'Explore', desc: 'Mind map & study guide', types: ['mindmap', 'guide'] },
  { n: 3, icon: '🧠', label: 'Recall', desc: 'Flashcard practice', types: [] },
  { n: 4, icon: '✅', label: 'Test', desc: 'Multiple choice quiz', types: [] },
  { n: 5, icon: '📊', label: 'Review', desc: 'Session summary', types: ['infographic'] },
];

export default async function TopicPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const db = getDb();
  const topic = db.prepare('SELECT t.*, s.name as subject_name, s.id as subject_id, s.icon as subject_icon, s.bg_color FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = ?').get(params.id) as any;
  if (!topic) notFound();

  const isAdmin = session.user.role === 'admin';
  if (!topic.is_published && !isAdmin && session.user.role !== 'test') {
    redirect('/dashboard');
  }

  const materials = db.prepare('SELECT * FROM materials WHERE topic_id = ? ORDER BY session_stage, created_at').all(params.id) as any[];
  const questions = db.prepare('SELECT COUNT(*) as n FROM questions WHERE topic_id = ?').get(params.id) as any;
  const flashcards = db.prepare('SELECT COUNT(*) as n FROM flashcards WHERE topic_id = ?').get(params.id) as any;

  const progress = db.prepare('SELECT * FROM session_progress WHERE user_id = ? AND topic_id = ?').get(session.user.id, params.id) as any;
  const completedStages: number[] = progress ? JSON.parse(progress.completed_stages) : [];
  const currentStage = progress?.current_stage || 1;
  const stars = completedStages.includes(5) ? 3 : completedStages.includes(4) ? 2 : completedStages.length > 0 ? 1 : 0;

  const bestQuiz = db.prepare('SELECT MAX(score_pct) as best FROM quiz_attempts WHERE user_id = ? AND topic_id = ?').get(session.user.id, params.id) as any;

  return (
    <div className="min-h-screen bg-paper">
      <nav className="bg-surface text-paper px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href={`/subjects/${topic.subject_id}`} className="font-mono text-xs text-white/50 hover:text-white transition-colors">← {topic.subject_name}</Link>
        <span className="font-serif text-xl font-semibold text-white">
          Grade 8 <span className="text-gold-light">Tutor</span>
        </span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Topic header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs tracking-wider text-gold uppercase">{topic.subject_name}</span>
            {!topic.is_published && (
              <span className="font-mono text-xs bg-gold/10 text-gold px-2 py-0.5 rounded">Draft</span>
            )}
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink mb-2">{topic.title}</h1>
          {topic.description && <p className="font-sans text-ink-3 leading-relaxed">{topic.description}</p>}

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-1">
              {[1,2,3].map(s => (
                <span key={s} className={`text-xl ${s <= stars ? 'text-gold' : 'text-rule'}`}>★</span>
              ))}
            </div>
            {bestQuiz?.best !== null && bestQuiz?.best !== undefined && (
              <span className="font-mono text-sm text-teal">Best quiz: {bestQuiz.best}%</span>
            )}
            <span className="font-mono text-sm text-ink-4">{completedStages.length}/5 stages</span>
          </div>
        </div>

        {/* 5-stage overview */}
        <div className="border border-rule rounded-2xl overflow-hidden mb-8">
          {STAGES.map(stage => {
            const stageMaterials = materials.filter(m => m.session_stage === stage.n);
            const hasMaterials = stageMaterials.length > 0 || (stage.n === 3 && flashcards.n > 0) || (stage.n === 4 && questions.n > 0);
            const isDone = completedStages.includes(stage.n);
            const isActive = currentStage === stage.n;
            const isLocked = stage.n > currentStage && !completedStages.includes(stage.n - 1) && stage.n > 1;

            return (
              <div
                key={stage.n}
                className={`flex items-center gap-4 px-5 py-4 border-b border-rule last:border-b-0 ${isDone ? 'bg-sage-light/40' : isActive ? 'bg-cobalt-light/40' : 'bg-paper'}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${isDone ? 'bg-sage-light' : isActive ? 'bg-cobalt-light' : 'bg-paper-2'}`}>
                  {isDone ? '✓' : stage.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-ink text-sm">{stage.label}</span>
                    <span className="font-mono text-xs text-ink-4">Stage {stage.n}</span>
                    {!hasMaterials && stage.n !== 5 && (
                      <span className="font-mono text-xs text-ink-4 bg-paper-3 px-2 py-0.5 rounded">Coming soon</span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-ink-3">{stage.desc}</p>
                  {stage.n === 3 && <p className="font-mono text-xs text-ink-4">{flashcards.n} flashcards</p>}
                  {stage.n === 4 && <p className="font-mono text-xs text-ink-4">{questions.n} questions</p>}
                </div>
                <div className="flex-shrink-0">
                  {isDone ? (
                    <span className="font-mono text-xs text-sage">Done</span>
                  ) : isActive ? (
                    <span className="font-mono text-xs text-cobalt font-semibold">Current</span>
                  ) : (
                    <span className="font-mono text-xs text-ink-4">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        <div className="text-center">
          <Link
            href={`/session/${topic.id}`}
            className="inline-block bg-ink text-paper px-8 py-3 rounded-xl font-sans font-medium hover:bg-ink-2 transition-colors"
          >
            {completedStages.length === 0 ? '🎬 Start Session' : completedStages.includes(5) ? '↩ Review Again' : '▶ Continue Session'}
          </Link>
          {isAdmin && (
            <Link
              href={`/admin/topics/${topic.id}`}
              className="inline-block ml-4 bg-paper-3 text-ink-2 px-6 py-3 rounded-xl font-sans font-medium hover:bg-rule transition-colors"
            >
              ⚙ Manage Content
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
