import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import {
  getProjects, importProject, analyzeProject,
  generateMigration, getOllamaStatus, getMigrations
} from '../services/api.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [migrations, setMigrations] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projRes, migRes, ollamaRes] = await Promise.all([
        getProjects(),
        getMigrations(),
        getOllamaStatus().catch(() => ({ data: { available: false } }))
      ]);
      setProjects(projRes.data.projects);
      setMigrations(migRes.data.migrations);
      setOllamaStatus(ollamaRes.data);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImport = async () => {
    setActionLoading('import');
    try {
      const res = await importProject('Pandas Sample Project', 'Demo project with deprecated DataFrame.append() calls');
      showToast('Project imported successfully!', 'success');
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleAnalyze = async (projectId) => {
    setActionLoading('analyze-' + projectId);
    try {
      const res = await analyzeProject(projectId);
      showToast(`Found ${res.data.analysis.deprecatedApis.length} deprecated API(s)`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Analysis failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleMigrate = async (projectId) => {
    setActionLoading('migrate-' + projectId);
    try {
      const res = await generateMigration(projectId, 'pandas 2.x');
      showToast('Migration generated! View results →', 'success');
      await loadData();
      navigate(`/migration/${res.data.migration.id}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Migration failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--obsidian-100)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', padding: 'var(--space-8) var(--space-6)' }}>
      <div className="container">
        {/* Welcome */}
        <div style={{ marginBottom: 'var(--space-8)' }} className="animate-fade-in">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Welcome back, <span className="gradient-text">{user?.name || 'Developer'}</span>
          </h1>
          <p style={{ color: 'var(--obsidian-100)', fontSize: '0.9rem' }}>
            Manage your projects and code migrations
          </p>
        </div>

        {/* Status cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)', marginBottom: 'var(--space-8)',
        }} className="stagger">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--obsidian-100)', marginBottom: 'var(--space-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Engine
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: ollamaStatus?.available ? 'var(--success)' : 'var(--warning)',
                boxShadow: ollamaStatus?.available
                  ? '0 0 8px rgba(34, 197, 94, 0.5)'
                  : '0 0 8px rgba(245, 158, 11, 0.5)',
              }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {ollamaStatus?.available ? 'Ollama Connected' : 'Deterministic Engine'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--obsidian-200)', marginTop: 'var(--space-2)' }}>
              {ollamaStatus?.available
                ? `Model: ${ollamaStatus.requiredModel}`
                : 'Fallback: verynth-deterministic-engine-v1'
              }
            </div>
          </div>

          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--obsidian-100)', marginBottom: 'var(--space-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Projects
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--teal-400)' }}>
              {projects.length}
            </div>
          </div>

          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--obsidian-100)', marginBottom: 'var(--space-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Migrations
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--titanium-400)' }}>
              {migrations.length}
            </div>
          </div>
        </div>

        {/* Import section */}
        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                📦 Import Demo Project
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--obsidian-100)' }}>
                Import the Pandas sample project with deprecated DataFrame.append() calls
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={actionLoading === 'import'}
              id="import-project-btn"
            >
              {actionLoading === 'import'
                ? <><div className="spinner" /> Importing...</>
                : '+ Import Project'
              }
            </button>
          </div>
        </div>

        {/* Projects list */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Your Projects
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {projects.map(project => {
                const deprecatedApis = project.deprecatedApis || [];
                const deps = project.dependencies;
                return (
                  <div key={project.id} className="card" style={{
                    padding: 'var(--space-5)',
                    cursor: 'pointer',
                    border: selectedProject === project.id
                      ? '1px solid var(--teal-500)' : '1px solid var(--obsidian-500)',
                  }}
                  onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{project.name}</h3>
                          <span className={`badge ${project.status === 'analyzed' ? 'badge-teal' : 'badge-titanium'}`}>
                            {project.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--obsidian-100)' }}>
                          {project.description || 'No description'}
                        </p>

                        {deps && deps.found && (
                          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {deps.dependencies.map(d => (
                              <span key={d.name} className="badge badge-titanium" style={{ fontSize: '0.7rem' }}>
                                {d.name} {d.constraint}{d.version}
                              </span>
                            ))}
                          </div>
                        )}

                        {deprecatedApis.length > 0 && (
                          <div style={{ marginTop: 'var(--space-3)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error)', marginBottom: 'var(--space-2)' }}>
                              ⚠ {deprecatedApis.length} Deprecated API(s) Found:
                            </div>
                            {deprecatedApis.slice(0, 5).map((api, i) => (
                              <div key={i} style={{
                                fontSize: '0.78rem', color: 'var(--obsidian-100)',
                                fontFamily: 'var(--font-mono)',
                                padding: 'var(--space-1) var(--space-2)',
                                background: 'rgba(239, 68, 68, 0.06)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 'var(--space-1)',
                              }}>
                                Line {api.line}: <span style={{ color: '#f87171' }}>{api.api}</span>
                                {' → '}<span style={{ color: 'var(--teal-400)' }}>{api.replacement}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {project.status === 'imported' && (
                          <button
                            className="btn btn-secondary"
                            onClick={(e) => { e.stopPropagation(); handleAnalyze(project.id); }}
                            disabled={actionLoading === 'analyze-' + project.id}
                            id={`analyze-${project.id}`}
                          >
                            {actionLoading === 'analyze-' + project.id
                              ? <><div className="spinner" /> Analyzing...</>
                              : '🔍 Analyze'
                            }
                          </button>
                        )}
                        {project.status === 'analyzed' && deprecatedApis.length > 0 && (
                          <button
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleMigrate(project.id); }}
                            disabled={actionLoading === 'migrate-' + project.id}
                            id={`migrate-${project.id}`}
                          >
                            {actionLoading === 'migrate-' + project.id
                              ? <><div className="spinner" /> Migrating...</>
                              : '🤖 Migrate to Pandas 2.x'
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent migrations */}
        {migrations.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Recent Migrations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {migrations.slice(0, 5).map(mig => (
                <div
                  key={mig.id}
                  className="card"
                  style={{ padding: 'var(--space-4)', cursor: 'pointer' }}
                  onClick={() => navigate(`/migration/${mig.id}`)}
                  id={`migration-card-${mig.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{mig.project_name}</span>
                        <span className={`badge ${
                          mig.status === 'approved' ? 'badge-success' :
                          mig.status === 'rejected' ? 'badge-error' :
                          mig.status === 'completed' ? 'badge-teal' : 'badge-titanium'
                        }`}>
                          {mig.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--obsidian-200)', marginTop: 'var(--space-1)' }}>
                        {mig.source_version} → {mig.target_version}
                        {mig.model_used && (
                          <span style={{ marginLeft: 'var(--space-3)', color: 'var(--obsidian-100)' }}>
                            Model: {mig.model_used}
                          </span>
                        )}
                        {mig.inference_time_ms != null && (
                          <span style={{ marginLeft: 'var(--space-3)', color: 'var(--teal-400)' }}>
                            {mig.inference_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--obsidian-200)' }}>
                      {new Date(mig.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
