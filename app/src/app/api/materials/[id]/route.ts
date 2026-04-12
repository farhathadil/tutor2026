import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/faa/tutor/uploads';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const mat = db.prepare('SELECT filename FROM materials WHERE id=?').get(params.id) as any;
  if (mat) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, mat.filename)); } catch {}
    db.prepare('DELETE FROM materials WHERE id=?').run(params.id);
  }
  return NextResponse.json({ ok: true });
}
