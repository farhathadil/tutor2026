'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [newTopic, setNewTopic] = useState({ subject_id: '', title: '', description: '', is_published: false });
  const [showTopicForm, setShowTopicForm] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, any[]>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const subs = await fetch('/api/subjects').then(r => r.json());
    setSubjects(subs);
    // load topics for each subject
    const counts: Record<string, number> = {};
    const allTopics: Record<string, any[]> = {};
    for (const s of subs) {
      const t = await fetch(`/api/topics?subjectId=${s.id}`).then(r => r.json());
      counts[s.id] = t.length;
      allTopics[s.id] = t;
    }
    setTopicCounts(counts);
    setTopics(allTopics);
  }

  useEffect(() => { load(); }, []);

  async function createTopic() {
    setSaving(true);
    await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTopic, sort_order: (topics[newTopic.subject_id] || []).length }),
    });
    setNewTopic({ subject_id: '', title: '', description: '', is_published: false });
    setShowTopicForm(null);
    setSaving(false);
    await load();
  }

  async function togglePublish(topicId: string, currentVal: boolean, subjectId: string) {
    const topic = topics[subjectId].find(t => t.id === topicId);
    await fetch(`/api/topics/${topicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...topic, is_published: !currentVal }),
    });
    await load();
  }

  async function deleteTopic(topicId: string) {
    if (!confirm('Delete this topic and all its content?')) return;
    await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-wider text-gold uppercase mb-1">Content</p>
        <h1 className="font-serif text-3xl font-bold text-ink">Subjects & Topics</h1>
        <p className="font-sans text-sm text-ink-3 mt-1">Create topics within each subject and manage content</p>
      </div>

      <div className="space-y-6">
        {subjects.map(sub => (
          <div key={sub.id} className="bg-paper-2 border border-rule rounded-2xl overflow-hidden">
            {/* Subject header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-rule bg-paper">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: sub.bg_color }}>
                {sub.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-sans font-semibold text-ink text-sm">{sub.name}</h3>
                <p className="font-mono text-xs text-ink-4">{sub.code} · {topicCounts[sub.id] || 0} topics</p>
              </div>
              <button
                onClick={() => setShowTopicForm(showTopicForm === sub.id ? null : sub.id)}
                className="text-xs font-sans bg-ink text-paper px-3 py-1.5 rounded-lg hover:bg-ink-2 transition-colors"
              >
                + Add Topic
              </button>
            </div>

            {/* Add topic form */}
            {showTopicForm === sub.id && (
              <div className="px-5 py-4 bg-cobalt-light border-b border-rule">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    placeholder="Topic title *"
                    value={newTopic.title}
                    onChange={e => setNewTopic({ ...newTopic, title: e.target.value, subject_id: sub.id })}
                    className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={newTopic.description}
                    onChange={e => setNewTopic({ ...newTopic, description: e.target.value, subject_id: sub.id })}
                    className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-sans text-ink-2">
                    <input type="checkbox" checked={newTopic.is_published}
                      onChange={e => setNewTopic({ ...newTopic, is_published: e.target.checked, subject_id: sub.id })}
                      className="rounded" />
                    Publish immediately
                  </label>
                  <button onClick={createTopic} disabled={!newTopic.title || saving}
                    className="px-4 py-1.5 bg-ink text-paper rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Topic'}
                  </button>
                  <button onClick={() => setShowTopicForm(null)} className="text-sm text-ink-4 hover:text-ink">Cancel</button>
                </div>
              </div>
            )}

            {/* Topics list */}
            {(topics[sub.id] || []).length === 0 ? (
              <div className="px-5 py-4 text-sm text-ink-4 font-sans italic">No topics yet</div>
            ) : (
              <div className="divide-y divide-rule">
                {(topics[sub.id] || []).map(topic => (
                  <div key={topic.id} className="flex items-center gap-3 px-5 py-3 hover:bg-paper transition-colors">
                    <div className="flex-1">
                      <span className="font-sans text-sm text-ink font-medium">{topic.title}</span>
                      {topic.description && <span className="font-sans text-xs text-ink-4 ml-2">{topic.description}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${topic.is_published ? 'bg-sage-light text-sage' : 'bg-gold/10 text-gold'}`}>
                        {topic.is_published ? 'Published' : 'Draft'}
                      </span>
                      <button onClick={() => togglePublish(topic.id, !!topic.is_published, sub.id)}
                        className="text-xs text-ink-4 hover:text-ink font-mono px-2 py-1 hover:bg-paper-3 rounded">
                        {topic.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <Link href={`/admin/topics/${topic.id}`}
                        className="text-xs text-cobalt hover:text-ink font-mono px-2 py-1 hover:bg-cobalt-light rounded">
                        Edit Content
                      </Link>
                      <button onClick={() => deleteTopic(topic.id)}
                        className="text-xs text-crimson hover:text-crimson/70 font-mono px-2 py-1 hover:bg-crimson-light rounded">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
