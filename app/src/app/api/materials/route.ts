import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/faa/tutor/uploads';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const db = getDb();
  const mats = db.prepare(
    `SELECT * FROM materials WHERE topic_id = ? ORDER BY session_stage, created_at`
  ).all(topicId || '');
  return NextResponse.json(mats);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const topicId = formData.get('topicId') as string;
  const type = formData.get('type') as string;
  const title = formData.get('title') as string;
  const session_stage = parseInt(formData.get('session_stage') as string) || 1;

  if (!file || !topicId || !type || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name);
  const filename = `${uuid()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  const bytes = await file.arrayBuffer();
  fs.writeFileSync(fullPath, Buffer.from(bytes));

  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO materials (id, topic_id, type, title, filename, original_name, file_size_bytes, session_stage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, topicId, type, title, filename, file.name, file.size, session_stage);

  return NextResponse.json({ id, filename });
}
