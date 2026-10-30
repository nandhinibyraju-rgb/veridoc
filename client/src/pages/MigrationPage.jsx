import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMigration, runTests, approveMigration, rejectMigration } from '../services/api.js';

function CodeBlock({ code, title, type }) {
  const lines = (code || '').split('\n');
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 700, color: type === 'original' ? 'var(--error)' : 'var(--success)',
        padding: 'var(--space-2) var(--space-4)',
        background: type === 'original' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        borderBottom: '1px solid var(--obsidian-500)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      <div className="code-block" style={{
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        maxHeight: 600, overflowY: 'auto',
        margin: 0,
      }}>
        {lines.map((line, i) => (
          <span key={i} className="code-line">
            <span className="code-line-number">{i + 1}</span>
            {line}
            {'\n'}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiffView({ original, migrated }) {
  const origLines = (original || '').split('\n');
  const migLines = (migrated || '').split('\n');

  // Simple diff: show lines that differ
  const maxLen = Math.max(origLines.length, migLines.length);
  const diffLines = [];

  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i] || '';
    const migLine = migLines[i] || '';
    if (origLine !== migLine) {
      if (origLine) diffLines.push({ type: 'removed', line: origLine, num: i + 1 });
      if (migLine) diffLines.push({ type: 'added', line: migLine, num: i + 1 });
    }
  }

  if (diffLines.length === 0) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--obsidian-100)' }}>
        No differences found — code is identical.
      </div>
    );
  }

  return (
    <div className="code-block" style={{ maxHeight: 400, overflowY: 'auto' }}>
      {diffLines.map((d, i) => (
        <span key={i} className={`code-line ${d.type === 'added' ? 'code-line-added' : 'code-line-removed'}`}>
          <span className="code-line-number">{d.num}</span>
          <span style={{ color: d.type === 'added' ? '#4ade80' : '#f87171', marginRight: 8 }}>
            {d.type === 'added' ? '+' : '-'}
          </span>
          {d.line}
          {'\n'}
        </span>
      ))}
    </div>
  );
}

export default function MigrationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [migration, setMigration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'diff'
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  useEffect(() => {
    loadMigration();
  }, [id]);

  const loadMigration = async () => {
    try {
      const res = await getMigration(id);
      setMigration(res.data.migration);
      if (res.data.migration.tests && res.data.migration.tests.length > 0) {
        setTestResults(res.data.migration.tests);
      }
    } catch (err) {
      showToast('Failed to load migration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRunTests = async () => {
    setTestLoading(true);
    try {
      const res = await runTests(id);
      setTestResults(res.data.results);
      showToast(res.data.message, res.data.results.every(t => t.status === 'passed') ? 'success' : 'error');
    } catch (err) {
      showToast(err.response?.data?.error || 'Test execution failed', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      await approveMigration(id);
      showToast('Migration approved! ✅', 'success');
      await loadMigration();
    } catch (err) {
      showToast('Failed to approve', 'error');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectMigration(id, 'Manual rejection');
      showToast('Migration rejected', 'info');
      await loadMigration();
    } catch (err) {
      showToast('Failed to reject', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--obsidian-100)' }}>Loading migration...</p>
        </div>
      </div>
    );
  }

  if (!migration) {
    return (
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <p style={{ color: 'var(--error)', marginBottom: 'var(--space-4)' }}>Migration not found</p>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const files = migration.files || [];
  const currentFile = files[selectedFileIdx];

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', padding: 'var(--space-6)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}
            style={{ marginBottom: 'var(--space-3)' }}>
            ← Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
                Migration <span className="gradient-text">{migration.id.slice(0, 12)}...</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span className={`badge ${
                  migration.status === 'approved' ? 'badge-success' :
                  migration.status === 'rejected' ? 'badge-error' :
                  migration.status === 'completed' ? 'badge-teal' : 'badge-titanium'
                }`}>
                  {migration.status}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--obsidian-100)' }}>
                  {migration.source_version} → {migration.target_version}
                </span>
                {migration.model_used && (
                  <span className="badge badge-titanium">
                    {migration.model_used}
                  </span>
                )}
                {migration.inference_time_ms != null && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--teal-400)' }}>
                    ⚡ {migration.inference_time_ms}ms
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {migration.status === 'completed' && (
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleRunTests}
                  disabled={testLoading}
                  id="run-tests-btn"
                >
                  {testLoading ? <><div className="spinner" /> Running Tests...</> : '🧪 Run Tests'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApprove}
                  disabled={approveLoading}
                  id="approve-btn"
                >
                  {approveLoading ? <><div className="spinner" /> Approving...</> : '✅ Approve'}
                </button>
                <button className="btn btn-danger" onClick={handleReject} id="reject-btn">
                  ✗ Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {migration.summary && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--titanium-500)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Migration Summary
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--obsidian-100)' }}>{migration.summary}</p>
          </div>
        )}

        {/* Test Results */}
        {testResults && testResults.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--titanium-500)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Test Results
            </div>
            {testResults.map((test, i) => (
              <div key={i} style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: test.status === 'passed' ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: `1px solid ${test.status === 'passed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                marginBottom: 'var(--space-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ color: test.status === 'passed' ? 'var(--success)' : 'var(--error)', fontSize: '1.1rem' }}>
                      {test.status === 'passed' ? '✓' : '✗'}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                      color: test.status === 'passed' ? '#4ade80' : '#f87171',
                    }}>
                      {test.file || test.test_file}
                    </span>
                  </div>
                  {test.durationMs != null && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--obsidian-200)' }}>
                      {test.durationMs || test.duration_ms}ms
                    </span>
                  )}
                </div>
                {test.output && test.status !== 'passed' && (
                  <pre style={{
                    marginTop: 'var(--space-2)', fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)', color: '#f87171',
                    whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
                  }}>
                    {test.output}
                  </pre>
                )}
                {test.output && test.status === 'passed' && (
                  <pre style={{
                    marginTop: 'var(--space-2)', fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)', color: 'var(--obsidian-100)',
                    whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
                  }}>
                    {test.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File tabs & view mode */}
        {files.length > 0 && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)',
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {files.map((f, i) => (
                  <button
                    key={i}
                    className={`btn ${i === selectedFileIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSelectedFileIdx(i)}
                  >
                    {f.file_path || f.filePath}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className={`btn btn-sm ${viewMode === 'side-by-side' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('side-by-side')}
                >
                  Side by Side
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'diff' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('diff')}
                >
                  Diff View
                </button>
              </div>
            </div>

            {/* Changes list */}
            {currentFile && (currentFile.changes_json || currentFile.changes) && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                {(typeof currentFile.changes_json === 'string'
                  ? JSON.parse(currentFile.changes_json)
                  : currentFile.changes || []
                ).map((change, i) => (
                  <div key={i} style={{
                    fontSize: '0.78rem', color: 'var(--teal-400)',
                    fontFamily: 'var(--font-mono)',
                    padding: 'var(--space-1) var(--space-2)',
                    marginBottom: 'var(--space-1)',
                  }}>
                    • {change}
                  </div>
                ))}
              </div>
            )}

            {/* Code comparison */}
            {currentFile && viewMode === 'side-by-side' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)',
              }}>
                <CodeBlock
                  code={currentFile.original_content || currentFile.originalCode}
                  title="Original Code"
                  type="original"
                />
                <CodeBlock
                  code={currentFile.migrated_content || currentFile.migratedCode}
                  title="Migrated Code"
                  type="migrated"
                />
              </div>
            )}

            {currentFile && viewMode === 'diff' && (
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--titanium-500)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'var(--obsidian-600)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Unified Diff
                </div>
                <DiffView
                  original={currentFile.original_content || currentFile.originalCode}
                  migrated={currentFile.migrated_content || currentFile.migratedCode}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
