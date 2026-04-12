'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const MATERIAL_TYPES = [
  { value: 'slide', label: 'Slideshow', icon: '🖥️', stage: 1, accept: '.pdf,.pptx,.key' },
  { value: 'audio', label: 'Podcast/Audio', icon: '🎧', stage: 1, accept: '.mp3,.m4a,.wav,.ogg' },
  { value: 'guide', label: 'Study Guide', icon: '📋', stage: 2, accept: '.pdf,.docx' },
  { value: 'mindmap', label: 'Mind Map', icon: '🗺️', stage: 2, accept: '.png,.jpg,.svg,.pdf' },
  { value: 'infographic', label: 'Infographic', icon: '📊', stage: 5, accept: '.png,.jpg,.svg,.pdf' },
];

export default function AdminTopicPage() {
  const params = useParams();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'materials' | 'questions' | 'flashcards'>('materials');
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({ type: 'slide', title: '', stage: 1 });
  const fileRef = useRef<HTMLInputElement>(null);

  // New question form
  const [newQ, setNewQ] = useState({ stem: '', options: ['', '', '', ''], correct_index: 0, explanation: '' });
  const [savingQ, setSavingQ] = useState(false);

  // New flashcard form
  const [newFC, setNewFC] = useState({ front_text: '', back_text: '' });
  const [savingFC, setSavingFC] = useState(false);

  async function load() {
    const [t, m, q, f] = await Promise.all([
      fetch(`/api/topics/${topicId}`).then(r => r.json()),
      fetch(`/api/materials?topicId=${topicId}`).then(r => r.json()),
      fetch(`/api/questions?topicId=${topicId}`).then(r => r.json()),
      fetch(`/api/flashcards?topicId=${topicId}`).then(r => r.json()),
    ]);
    setTopic(t);
    setMaterials(m);
    setQuestions(q);
    setFlashcards(f);
  }

  useEffect(() => { load(); }, [topicId]);

  async function uploadMaterial() {
    if (!fileRef.current?.files?.[0]) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', fileRef.current.files[0]);
    fd.append('topicId', topicId);
    fd.append('type', uploadMeta.type);
    fd.append('title', uploadMeta.title || fileRef.current.files[0].name);
    fd.append('session_stage', String(uploadMeta.stage));
    await fetch('/api/materials', { method: 'POST', body: fd });
    setUploading(false);
    fileRef.current.value = '';
    setUploadMeta({ type: 'slide', title: '', stage: 1 });
    await load();
  }

  async function deleteMaterial(id: string) {
    if (!confirm('Delete this material?')) return;
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveQuestion() {
    setSavingQ(true);
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newQ, topic_id: topicId, sort_order: questions.length }),
    });
    setNewQ({ stem: '', options: ['', '', '', ''], correct_index: 0, explanation: '' });
    setSavingQ(false);
    await load();
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveFlashcard() {
    setSavingFC(true);
    await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newFC, topic_id: topicId, sort_order: flashcards.length }),
    });
    setNewFC({ front_text: '', back_text: '' });
    setSavingFC(false);
    await load();
  }

  async function deleteFlashcard(id: string) {
    if (!confirm('Delete this flashcard?')) return;
    await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
    await load();
  }

  if (!topic) return <div className="p-8 font-sans text-ink-3">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/subjects" className="font-mono text-xs text-ink-4 hover:text-ink">← Back to Subjects</Link>
        <h1 className="font-serif text-2xl font-bold text-ink mt-2">{topic.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`font-mono text-xs px-2 py-0.5 rounded ${topic.is_published ? 'bg-sage-light text-sage' : 'bg-gold/10 text-gold'}`}>
            {topic.is_published ? 'Published' : 'Draft'}
          </span>
          <Link href={`/topics/${topicId}`} className="font-mono text-xs text-cobalt hover:underline">
            Preview →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule mb-6">
        {([
          { key: 'materials', label: `Materials (${materials.length})`, icon: '📁' },
          { key: 'questions', label: `Questions (${questions.length})`, icon: '❓' },
          { key: 'flashcards', label: `Flashcards (${flashcards.length})`, icon: '🃏' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 font-sans text-sm transition-colors ${activeTab === tab.key ? 'border-b-2 border-gold text-gold font-medium' : 'text-ink-4 hover:text-ink'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* MATERIALS TAB */}
      {activeTab === 'materials' && (
        <div>
          {/* Upload form */}
          <div className="bg-cobalt-light border border-cobalt/20 rounded-xl p-5 mb-6">
            <h3 className="font-sans font-semibold text-ink text-sm mb-4">Upload Material</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <select
                value={uploadMeta.type}
                onChange={e => {
                  const t = MATERIAL_TYPES.find(m => m.value === e.target.value);
                  setUploadMeta({ type: e.target.value, title: '', stage: t?.stage || 1 });
                }}
                className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
              >
                {MATERIAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              <input
                placeholder="Title (optional)"
                value={uploadMeta.title}
                onChange={e => setUploadMeta({ ...uploadMeta, title: e.target.value })}
                className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
              />
              <input
                type="file"
                ref={fileRef}
                accept={MATERIAL_TYPES.find(t => t.value === uploadMeta.type)?.accept}
                className="text-sm font-sans text-ink-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-ink file:text-paper file:text-xs file:cursor-pointer"
              />
            </div>
            <button
              onClick={uploadMaterial}
              disabled={uploading}
              className="px-5 py-2 bg-ink text-paper rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload File'}
            </button>
          </div>

          {/* Materials list */}
          {materials.length === 0 ? (
            <p className="font-sans text-sm text-ink-4 italic">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map(m => {
                const mt = MATERIAL_TYPES.find(t => t.value === m.type);
                return (
                  <div key={m.id} className="flex items-center gap-3 bg-paper-2 border border-rule rounded-xl px-4 py-3">
                    <span className="text-lg">{mt?.icon}</span>
                    <div className="flex-1">
                      <span className="font-sans text-sm text-ink font-medium">{m.title}</span>
                      <span className="font-mono text-xs text-ink-4 ml-2">{m.original_name}</span>
                    </div>
                    <span className="font-mono text-xs text-ink-4 bg-paper-3 px-2 py-0.5 rounded">Stage {m.session_stage}</span>
                    <span className="font-mono text-xs text-ink-4 bg-paper-3 px-2 py-0.5 rounded uppercase">{m.type}</span>
                    <a href={`/api/uploads/${m.filename}`} target="_blank" rel="noreferrer"
                      className="font-mono text-xs text-cobalt hover:underline">View</a>
                    <button onClick={() => deleteMaterial(m.id)}
                      className="font-mono text-xs text-crimson hover:text-crimson/70">Delete</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div>
          {/* Add question form */}
          <div className="bg-paper-2 border border-rule rounded-xl p-5 mb-6">
            <h3 className="font-sans font-semibold text-ink text-sm mb-4">Add Question</h3>
            <textarea
              placeholder="Question stem *"
              value={newQ.stem}
              onChange={e => setNewQ({ ...newQ, stem: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold mb-3"
            />
            <div className="space-y-2 mb-3">
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQ.correct_index === i}
                    onChange={() => setNewQ({ ...newQ, correct_index: i })}
                    className="accent-sage"
                  />
                  <span className="font-mono text-xs text-ink-4 w-5">{String.fromCharCode(65 + i)}.</span>
                  <input
                    placeholder={`Option ${String.fromCharCode(65 + i)} *`}
                    value={opt}
                    onChange={e => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ({ ...newQ, options: opts });
                    }}
                    className="flex-1 px-3 py-1.5 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
                  />
                  {newQ.correct_index === i && <span className="font-mono text-xs text-sage">✓ Correct</span>}
                </div>
              ))}
            </div>
            <input
              placeholder="Explanation (optional)"
              value={newQ.explanation}
              onChange={e => setNewQ({ ...newQ, explanation: e.target.value })}
              className="w-full px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold mb-3"
            />
            <button
              onClick={saveQuestion}
              disabled={!newQ.stem || newQ.options.some(o => !o) || savingQ}
              className="px-5 py-2 bg-ink text-paper rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50"
            >
              {savingQ ? 'Saving…' : 'Add Question'}
            </button>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <p className="font-sans text-sm text-ink-4 italic">No questions yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, qi) => (
                <div key={q.id} className="bg-paper-2 border border-rule rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-sans text-sm text-ink font-medium">{qi + 1}. {q.stem}</p>
                    <button onClick={() => deleteQuestion(q.id)} className="font-mono text-xs text-crimson hover:text-crimson/70 flex-shrink-0">Delete</button>
                  </div>
                  <div className="space-y-1">
                    {q.options.map((opt: string, oi: number) => (
                      <div key={oi} className={`text-xs font-sans px-3 py-1 rounded ${oi === q.correct_index ? 'bg-sage-light text-sage font-medium' : 'text-ink-3'}`}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <p className="font-sans text-xs text-ink-4 mt-2 italic">{q.explanation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FLASHCARDS TAB */}
      {activeTab === 'flashcards' && (
        <div>
          {/* Add flashcard form */}
          <div className="bg-paper-2 border border-rule rounded-xl p-5 mb-6">
            <h3 className="font-sans font-semibold text-ink text-sm mb-4">Add Flashcard</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-mono text-xs text-ink-4 uppercase tracking-wider mb-1 block">Front (Prompt)</label>
                <textarea
                  placeholder="Question or term *"
                  value={newFC.front_text}
                  onChange={e => setNewFC({ ...newFC, front_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-ink-4 uppercase tracking-wider mb-1 block">Back (Answer)</label>
                <textarea
                  placeholder="Answer or explanation *"
                  value={newFC.back_text}
                  onChange={e => setNewFC({ ...newFC, back_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
                />
              </div>
            </div>
            <button
              onClick={saveFlashcard}
              disabled={!newFC.front_text || !newFC.back_text || savingFC}
              className="px-5 py-2 bg-ink text-paper rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50"
            >
              {savingFC ? 'Saving…' : 'Add Flashcard'}
            </button>
          </div>

          {/* Flashcards list */}
          {flashcards.length === 0 ? (
            <p className="font-sans text-sm text-ink-4 italic">No flashcards yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flashcards.map((fc, i) => (
                <div key={fc.id} className="bg-paper-2 border border-rule rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-ink-4">#{i + 1}</span>
                    <button onClick={() => deleteFlashcard(fc.id)} className="font-mono text-xs text-crimson hover:text-crimson/70">Delete</button>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-paper rounded-lg p-3">
                      <p className="font-mono text-xs text-ink-4 mb-1">Front</p>
                      <p className="font-sans text-sm text-ink">{fc.front_text}</p>
                    </div>
                    <div className="bg-cobalt-light rounded-lg p-3">
                      <p className="font-mono text-xs text-cobalt mb-1">Back</p>
                      <p className="font-sans text-sm text-ink">{fc.back_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
