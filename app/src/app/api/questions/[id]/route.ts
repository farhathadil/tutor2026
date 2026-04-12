import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { stem, options, correct_index, explanation } = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE questions SET stem=?, options=?, correct_index=?, explanation=? WHERE id=?'
  ).run(stem, JSON.stringify(options), correct_index, explanation || null, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  db.prepare('DELETE FROM questions WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
