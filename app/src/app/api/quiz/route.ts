import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic_id, answers, duration_secs } = await req.json();
  // answers: { [question_id]: chosen_index }
  const db = getDb();

  const questions = db.prepare('SELECT id, correct_index FROM questions WHERE topic_id = ?').all(topic_id) as any[];
  if (!questions.length) return NextResponse.json({ error: 'No questions' }, { status: 400 });

  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correct_index) correct++;
  }
  const score_pct = Math.round((correct / questions.length) * 100);

  const id = uuid();
  db.prepare(
    `INSERT INTO quiz_attempts (id, user_id, topic_id, score_pct, answers, duration_secs)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, session.user.id, topic_id, score_pct, JSON.stringify(answers), duration_secs || 0);

  return NextResponse.json({ id, score_pct, correct, total: questions.length });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const db = getDb();

  const userId = session.user.role === 'admin' ? searchParams.get('userId') || session.user.id : session.user.id;
  const attempts = db.prepare(
    'SELECT * FROM quiz_attempts WHERE user_id = ? AND topic_id = ? ORDER BY attempted_at DESC'
  ).all(userId, topicId || '') as any[];

  return NextResponse.json(attempts.map(a => ({ ...a, answers: JSON.parse(a.answers) })));
}
