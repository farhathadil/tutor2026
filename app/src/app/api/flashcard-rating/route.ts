import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { flashcard_id, rating } = await req.json();
  const db = getDb();

  // Calculate next_due_at based on rating
  const daysMap: Record<string, number> = { easy: 14, medium: 7, hard: 0 };
  const days = daysMap[rating] ?? 7;
  const nextDue = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO flashcard_ratings (id, user_id, flashcard_id, rating, next_due_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), session.user.id, flashcard_id, rating, nextDue);

  return NextResponse.json({ ok: true, next_due_at: nextDue });
}
