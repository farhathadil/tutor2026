import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import SessionClient from './SessionClient';

export default async function SessionPage({ params }: { params: { topicId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const db = getDb();
  const topic = db.prepare(
    'SELECT t.*, s.name as subject_name, s.id as subject_id FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = ?'
  ).get(params.topicId) as any;
  if (!topic) notFound();

  const isAdmin = session.user.role === 'admin';
  if (!topic.is_published && !isAdmin && session.user.role !== 'test') redirect('/dashboard');

  const materials = db.prepare(
    `SELECT m.*, COUNT(ss.id) as slide_count
     FROM materials m
     LEFT JOIN slideshow_slides ss ON ss.material_id = m.id
     WHERE m.topic_id = ?
     GROUP BY m.id
     ORDER BY m.session_stage, m.created_at`
  ).all(params.topicId) as any[];

  const questions = db.prepare('SELECT * FROM questions WHERE topic_id = ? ORDER BY sort_order').all(params.topicId) as any[];
  const parsedQuestions = questions.map((q: any) => ({ ...q, options: JSON.parse(q.options) }));

  const flashcards = db.prepare('SELECT * FROM flashcards WHERE topic_id = ? ORDER BY sort_order').all(params.topicId) as any[];

  const progressRow = db.prepare('SELECT * FROM session_progress WHERE user_id = ? AND topic_id = ?').get(session.user.id, params.topicId) as any;
  const progress = progressRow ? {
    ...progressRow,
    completed_stages: JSON.parse(progressRow.completed_stages)
  } : null;

  // Recent flashcard ratings
  const ratings = db.prepare(
    `SELECT flashcard_id, rating FROM flashcard_ratings WHERE user_id = ? AND flashcard_id IN (SELECT id FROM flashcards WHERE topic_id = ?) ORDER BY rated_at DESC`
  ).all(session.user.id, params.topicId) as any[];

  const latestRatings: Record<string, string> = {};
  for (const r of ratings) {
    if (!latestRatings[r.flashcard_id]) latestRatings[r.flashcard_id] = r.rating;
  }

  return (
    <SessionClient
      topic={topic}
      materials={materials}
      questions={parsedQuestions}
      flashcards={flashcards}
      initialProgress={progress}
      latestRatings={latestRatings}
      userId={session.user.id}
      userRole={session.user.role}
      gateEnabled={!!topic.gate_enabled}
      gateMinScore={topic.gate_min_score || 60}
    />
  );
}
