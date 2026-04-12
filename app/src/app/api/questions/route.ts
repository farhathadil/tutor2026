import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const db = getDb();
  const questions = db.prepare('SELECT * FROM questions WHERE topic_id = ? ORDER BY sort_order').all(topicId || '');
  return NextResponse.json(questions.map((q: any) => ({ ...q, options: JSON.parse(q.options) })));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { topic_id, stem, options, correct_index, explanation, sort_order } = await req.json();
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO questions (id, topic_id, stem, options, correct_index, explanation, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, topic_id, stem, JSON.stringify(options), correct_index, explanation || null, sort_order ?? 0);
  return NextResponse.json({ id });
}
