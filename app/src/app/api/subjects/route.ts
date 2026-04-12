import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const db = getDb();
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY sort_order').all();
  return NextResponse.json(subjects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, code, color, bg_color, icon, sort_order } = await req.json();
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO subjects (id, name, code, color, bg_color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, code, color || '#000', bg_color || '#eee', icon || '📚', sort_order ?? 0);
  return NextResponse.json({ id });
}
