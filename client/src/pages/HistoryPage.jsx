import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api.js';

const ACTION_LABELS = {
  project_imported: { label: '📦 Project Imported', color: 'var(--titanium-400)' },
  migration_generated: { label: '🤖 Migration Generated', color: 'var(--teal-400)' },
  tests_executed: { label: '🧪 Tests Executed', color: 'var(--info)' },
  migration_approved: { label: '✅ Migration Approved', color: 'var(--success)' },
  migration_rejected: { label: '✗ Migration Rejected', color: 'var(--error)' },
};

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getHistory()
      .then(res => setHistory(res.data.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', padding: 'var(--space-8) var(--space-6)' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-6)' }}>
          <span className="gradient-text">Migration History</span>
        </h1>

        {history.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p style={{ color: 'var(--obsidian-100)', marginBottom: 'var(--space-4)' }}>
              No migration history yet
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Start a Migration →
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 'var(--space-8)' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute', left: 10, top: 0, bottom: 0, width: 2,
              background: 'linear-gradient(180deg, var(--teal-500), var(--titanium-500), var(--obsidian-500))',
            }} />

            {history.map((item, i) => {
              const actionInfo = ACTION_LABELS[item.action] || { label: item.action, color: 'var(--obsidian-100)' };
              return (
                <div key={item.id} className="animate-fade-in" style={{
                  position: 'relative', marginBottom: 'var(--space-5)',
                  animationDelay: `${i * 0.05}s`,
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -26, top: 6,
                    width: 12, height: 12, borderRadius: '50%',
                    background: actionInfo.color,
                    border: '2px solid var(--obsidian-700)',
                    boxShadow: `0 0 8px ${actionInfo.color}40`,
                  }} />

                  <div className="card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: actionInfo.color, marginBottom: 'var(--space-1)' }}>
                          {actionInfo.label}
                        </div>
                        {item.project_name && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--obsidian-100)' }}>
                            Project: {item.project_name}
                            {item.source_version && ` · ${item.source_version} → ${item.target_version}`}
                          </div>
                        )}
                        {item.details && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--obsidian-200)', marginTop: 'var(--space-1)', fontFamily: 'var(--font-mono)' }}>
                            {typeof item.details === 'string'
                              ? item.details
                              : JSON.stringify(item.details, null, 2)
                            }
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--obsidian-200)', whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
