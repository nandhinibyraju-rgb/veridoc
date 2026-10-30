import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

function HeroBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create floating particles
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const teal = new THREE.Color(0x2DD4BF);
    const titanium = new THREE.Color(0xC9B99A);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

      const color = Math.random() > 0.5 ? teal : titanium;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Connecting lines
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(Math.random() * particleCount) * 3;
      const b = Math.floor(Math.random() * particleCount) * 3;
      linePositions.push(positions[a], positions[a + 1], positions[a + 2]);
      linePositions.push(positions[b], positions[b + 1], positions[b + 2]);
    }
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2DD4BF, transparent: true, opacity: 0.08 });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      lines.rotation.y += 0.001;
      lines.rotation.x += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      zIndex: 0, pointerEvents: 'none',
    }} />
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <HeroBackground />

      {/* Nav bar */}
      <header style={{
        position: 'relative', zIndex: 10,
        padding: 'var(--space-5) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1280, margin: '0 auto',
      }}>
        <span style={{
          fontSize: '1.5rem', fontWeight: 800,
          background: 'linear-gradient(135deg, var(--teal-400), var(--titanium-400))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '0.1em',
        }}>
          VERYNTH
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link to="/login" className="btn btn-ghost" id="landing-sign-in">Sign In</Link>
          <Link to="/register" className="btn btn-primary" id="landing-get-started">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <main style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1280, margin: '0 auto', padding: 'var(--space-20) var(--space-6)',
        textAlign: 'center',
      }} className="animate-slide-up">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <span className="badge badge-teal" style={{ fontSize: '0.75rem', padding: 'var(--space-2) var(--space-4)' }}>
            ⚡ Powered by Qwen2.5-Coder-7B-Instruct
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 900, lineHeight: 1.1,
          marginBottom: 'var(--space-6)',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: '#e2e2ee' }}>Migrate Deprecated APIs</span>
          <br />
          <span className="gradient-text">With AI Precision</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--obsidian-100)',
          maxWidth: 640, margin: '0 auto var(--space-10)',
          lineHeight: 1.7,
        }}>
          VERYNTH analyzes your codebase, detects deprecated API usage, and generates
          verified migration patches using open-weight AI models — all locally, all securely.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg" id="hero-start-btn">
            Start Migrating →
          </Link>
          <a href="#features" className="btn btn-secondary btn-lg" id="hero-learn-btn">
            Learn How It Works
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 'var(--space-12)',
          marginTop: 'var(--space-16)', flexWrap: 'wrap',
        }}>
          {[
            { value: '< 5s', label: 'Migration Time' },
            { value: '100%', label: 'Local Execution' },
            { value: 'Open', label: 'Weight Model' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--teal-400), var(--titanium-400))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--obsidian-200)', marginTop: 'var(--space-1)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Features section */}
      <section id="features" style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1280, margin: '0 auto',
        padding: 'var(--space-20) var(--space-6)',
      }}>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, textAlign: 'center',
          marginBottom: 'var(--space-12)',
        }}>
          <span className="gradient-text">How VERYNTH Works</span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }} className="stagger">
          {[
            {
              icon: '📦',
              title: 'Import Project',
              description: 'Import your Python project and VERYNTH scans all source files, parsing dependencies and version constraints.'
            },
            {
              icon: '🔍',
              title: 'Detect Deprecated APIs',
              description: 'Automatic detection of deprecated API calls like DataFrame.append(), with severity ratings and migration suggestions.'
            },
            {
              icon: '🤖',
              title: 'AI Migration',
              description: 'Qwen2.5-Coder-7B-Instruct generates precise migration patches that preserve index behavior, types, and semantics.'
            },
            {
              icon: '🔬',
              title: 'Verify & Test',
              description: 'Run your existing test suite against the migrated code to verify correctness before applying any changes.'
            },
            {
              icon: '✅',
              title: 'Review & Approve',
              description: 'Side-by-side code comparison with highlighted changes. Approve or reject each migration with full history tracking.'
            },
            {
              icon: '🔒',
              title: 'Fully Local',
              description: 'All inference runs locally via Ollama. Your code never leaves your machine. No API keys needed.'
            },
          ].map(feature => (
            <div key={feature.title} className="card-glass" style={{ padding: 'var(--space-8)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>{feature.icon}</div>
              <h3 style={{
                fontSize: '1.1rem', fontWeight: 700,
                color: 'var(--titanium-400)', marginBottom: 'var(--space-3)',
              }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--obsidian-100)', lineHeight: 1.7 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid var(--obsidian-500)',
        padding: 'var(--space-8) var(--space-6)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--obsidian-200)' }}>
          VERYNTH — AI-Powered Code Migration Engine · MIT License · Powered by Qwen2.5-Coder-7B-Instruct (Apache 2.0)
        </p>
      </footer>
    </div>
  );
}
