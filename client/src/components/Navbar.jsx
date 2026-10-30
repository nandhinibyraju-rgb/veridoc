import { useAuth } from '../App.jsx';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '◆' },
    { path: '/history', label: 'History', icon: '◷' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--obsidian-500)',
      padding: '0 var(--space-6)',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <Link to="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          textDecoration: 'none', color: 'inherit',
        }}>
          <span style={{
            fontSize: '1.3rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--teal-400), var(--titanium-400))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '0.08em',
          }}>
            VERYNTH
          </span>
          <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>v1.0</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: location.pathname === item.path ? 'var(--teal-400)' : 'var(--obsidian-100)',
                background: location.pathname === item.path ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
                transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              }}
              onMouseEnter={e => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = 'var(--obsidian-600)';
                  e.currentTarget.style.color = '#e2e2ee';
                }
              }}
              onMouseLeave={e => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--obsidian-100)';
                }
              }}
            >
              <span>{item.icon}</span>
              <span className="hide-mobile">{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {user && (
            <span style={{
              fontSize: '0.8rem', color: 'var(--titanium-500)',
              fontWeight: 500,
            }} className="hide-mobile">
              {user.name}
            </span>
          )}
          <button
            onClick={signOut}
            className="btn btn-ghost btn-sm"
            id="sign-out-btn"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
