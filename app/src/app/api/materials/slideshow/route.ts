import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/faa/tutor/uploads';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const topicId = formData.get('topicId') as string;
  const title = formData.get('title') as string;
  const session_stage = parseInt(formData.get('session_stage') as string) || 1;
  const files = formData.getAll('files') as File[];

  if (!topicId || !title || files.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Sort files alphabetically by original name
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const db = getDb();
  const materialId = uuid();

  // Create the parent materials row (filename empty — slides tracked separately)
  db.prepare(
    `INSERT INTO materials (id, topic_id, type, title, filename, original_name, file_size_bytes, session_stage)
     VALUES (?, ?, 'slideshow', ?, '', '', 0, ?)`
  ).run(materialId, topicId, title, session_stage);

  // Save each file and create a slideshow_slides row
  const insertSlide = db.prepare(
    `INSERT INTO slideshow_slides (id, material_id, filename, original_name, sort_order) VALUES (?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i];
    const ext = path.extname(file.name);
    const filename = `${uuid()}${ext}`;
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(bytes));
    insertSlide.run(uuid(), materialId, filename, file.name, i);
  }

  return NextResponse.json({ id: materialId, slideCount: sorted.length });
}
