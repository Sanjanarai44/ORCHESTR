import React, { useEffect, useState, useRef } from 'react';

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// Animated counter
function Counter({ target, suffix = '', duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// Animated particle canvas
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(161,208,185,0.5)';
        ctx.fill();
      });
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(161,208,185,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

const STEPS = [
  { num: '01', icon: 'chat', title: 'Describe your event', body: 'Tell the AI what you\'re running — format, team size, scoring, stages. Plain language is enough.' },
  { num: '02', icon: 'auto_awesome', title: 'AI configures everything', body: 'The platform builds your full pipeline: stages, evaluation criteria, team rules, communication flows.' },
  { num: '03', icon: 'rocket_launch', title: 'Run it end to end', body: 'Manage participants, form teams, collect scores, flag anomalies, and advance stages — all from one command center.' },
];

const FEATURES = [
  { icon: 'hub', title: 'AI Team Formation', body: 'Skill-balanced, institutionally diverse teams formed algorithmically with human approval before any announcement.' },
  { icon: 'verified_user', title: 'Approval Gates', body: 'No roster, results, or progression email goes out without explicit organizer sign-off. You stay in control.' },
  { icon: 'analytics', title: 'Live Evaluation Engine', body: 'Judges score independently. Anomalies are flagged automatically. Leaderboard updates in real time.' },
  { icon: 'mark_email_read', title: 'AI-Drafted Comms', body: 'Welcome emails, team assignments, reminders, results — drafted by the AI, reviewed by you before sending.' },
  { icon: 'diversity_3', title: 'Any Event Format', body: 'Hackathons, case competitions, coding contests, sports tournaments — describe it once, the system adapts.' },
  { icon: 'monitoring', title: 'Command Dashboard', body: 'Full-spectrum visibility: pipeline stages, pending approvals, score breakdowns, activity log, anomaly alerts.' },
];

export default function LandingPage({ onNavigate, organizer }) {
  const [heroVisible, setHeroVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 60); }, []);

  return (
    <div style={{ background: '#040c07', color: '#e8f5ef', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(4,12,7,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(161,208,185,0.1)',
        opacity: heroVisible ? 1 : 0,
        transform: heroVisible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Main nav row */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 clamp(1rem, 5vw, 5rem)',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#012d1d', border: '1px solid rgba(161,208,185,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#a5d0b9', fontSize: 16 }}>terminal</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#e8f5ef' }}>ORCHESTR</span>
          </div>

          {/* Desktop nav links */}
          <div className="nav-desktop-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Features', 'How it works', 'For teams'].map(l => (
              <button key={l} style={{ background: 'none', border: 'none', color: 'rgba(232,245,239,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                className="nav-link">{l}</button>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="nav-desktop-cta" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {organizer ? (
              <button onClick={() => onNavigate('admin')}
                style={{ background: '#a5d0b9', color: '#012d1d', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => onNavigate('admin')}
                  style={{ background: 'none', border: '1px solid rgba(161,208,185,0.25)', color: '#a5d0b9', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Sign In
                </button>
                <button onClick={() => onNavigate('admin')}
                  style={{ background: '#a5d0b9', color: '#012d1d', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Get Started Free
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: '1px solid rgba(161,208,185,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a5d0b9' }}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, display: 'block' }}>
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{
            borderTop: '1px solid rgba(161,208,185,0.1)',
            padding: '16px clamp(1rem, 5vw, 5rem)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }} className="nav-mobile-menu">
            {['Features', 'How it works', 'For teams'].map(l => (
              <button key={l} style={{ background: 'none', border: 'none', color: 'rgba(232,245,239,0.7)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '8px 0' }}
                className="nav-link">{l}</button>
            ))}
            <div style={{ borderTop: '1px solid rgba(161,208,185,0.1)', paddingTop: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {organizer ? (
                <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                  style={{ background: '#a5d0b9', color: '#012d1d', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to Dashboard →
                </button>
              ) : (
                <>
                  <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                    style={{ background: 'none', border: '1px solid rgba(161,208,185,0.25)', color: '#a5d0b9', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sign In
                  </button>
                  <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                    style={{ background: '#a5d0b9', color: '#012d1d', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px clamp(1.5rem, 5vw, 5rem) 80px',
        position: 'relative', textAlign: 'center',
      }}>
        <ParticleField />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(161,208,185,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(161,208,185,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 700, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(1,45,29,0.6) 0%, transparent 70%)',
        }} />

        {/* Badge */}
        <div style={{
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(1,45,29,0.8)', border: '1px solid rgba(161,208,185,0.25)',
          borderRadius: 100, padding: '5px 14px', marginBottom: 28,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a5d0b9',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a5d0b9', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          AI-Powered Event Orchestration
        </div>

        {/* Headline */}
        <h1 style={{
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.04em', margin: '0 0 24px',
          background: 'linear-gradient(180deg, #e8f5ef 0%, rgba(161,208,185,0.7) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          maxWidth: 900,
        }}>
          Orchestrate Any Event.<br />Automatically.
        </h1>

        <p style={{
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease 0.32s, transform 0.8s ease 0.32s',
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(232,245,239,0.55)',
          maxWidth: 560, lineHeight: 1.7, margin: '0 0 40px',
        }}>
          Describe your event in plain language. ORCHESTR configures the entire platform — team formation, evaluation, communications, approvals — and runs it end to end.
        </p>

        {/* CTAs */}
        <div style={{
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease 0.44s, transform 0.8s ease 0.44s',
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <button onClick={() => onNavigate('admin')}
            style={{
              background: '#a5d0b9', color: '#012d1d', border: 'none',
              borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 40px rgba(165,208,185,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(165,208,185,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(165,208,185,0.25)'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
            Launch Your Event
          </button>
          <button onClick={() => onNavigate('participant')}
            style={{
              background: 'rgba(232,245,239,0.06)', color: '#e8f5ef',
              border: '1px solid rgba(232,245,239,0.15)',
              borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,245,239,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,245,239,0.06)'}>
            View Demo
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          opacity: heroVisible ? 0.4 : 0, transition: 'opacity 1s ease 1.2s',
          animation: 'float 2.5s ease-in-out infinite',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5d0b9' }}>Scroll</span>
          <span className="material-symbols-outlined" style={{ color: '#a5d0b9', fontSize: 18 }}>keyboard_arrow_down</span>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{
        borderTop: '1px solid rgba(161,208,185,0.08)',
        borderBottom: '1px solid rgba(161,208,185,0.08)',
        padding: '40px clamp(1.5rem, 5vw, 5rem)',
        background: 'rgba(1,45,29,0.15)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { val: 60, suffix: '+', label: 'Participants per event' },
            { val: 100, suffix: '%', label: 'Human-approved actions' },
            { val: 3, suffix: ' portals', label: 'Admin · Judge · Participant' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '0 24px',
              borderRight: i < 2 ? '1px solid rgba(161,208,185,0.1)' : 'none',
            }}>
              <p style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#a5d0b9', margin: 0, letterSpacing: '-0.04em' }}>
                <Counter target={s.val} suffix={s.suffix} />
              </p>
              <p style={{ fontSize: 12, color: 'rgba(232,245,239,0.4)', margin: '6px 0 0', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '100px clamp(1.5rem, 5vw, 5rem)', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5d0b9', opacity: 0.7 }}>How it works</span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '12px 0 0', color: '#e8f5ef' }}>
              From idea to live event<br />in one conversation.
            </h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <Reveal key={i} delay={i * 150}>
              <div style={{
                background: 'rgba(1,45,29,0.2)', border: '1px solid rgba(161,208,185,0.1)',
                borderRadius: 16, padding: '36px 32px', position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.3s, background 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(161,208,185,0.3)'; e.currentTarget.style.background = 'rgba(1,45,29,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(161,208,185,0.1)'; e.currentTarget.style.background = 'rgba(1,45,29,0.2)'; }}>
                <div style={{ position: 'absolute', top: 20, right: 24, fontSize: 48, fontWeight: 900, color: 'rgba(161,208,185,0.06)', letterSpacing: '-0.05em' }}>{s.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(161,208,185,0.1)', border: '1px solid rgba(161,208,185,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <span className="material-symbols-outlined" style={{ color: '#a5d0b9', fontSize: 22 }}>{s.icon}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#e8f5ef', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(232,245,239,0.5)', lineHeight: 1.7, margin: 0 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: '100px clamp(1.5rem, 5vw, 5rem)',
        background: 'rgba(1,45,29,0.12)',
        borderTop: '1px solid rgba(161,208,185,0.07)',
        borderBottom: '1px solid rgba(161,208,185,0.07)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ marginBottom: 64 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5d0b9', opacity: 0.7 }}>Features</span>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '12px 0 0', color: '#e8f5ef', maxWidth: 560 }}>
                Everything your event needs. Nothing it doesn't.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{
                  padding: '28px 28px', borderRadius: 14,
                  border: '1px solid rgba(161,208,185,0.08)',
                  background: 'rgba(4,12,7,0.5)',
                  display: 'flex', alignItems: 'flex-start', gap: 18,
                  transition: 'border-color 0.25s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(161,208,185,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(161,208,185,0.08)'}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(161,208,185,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#a5d0b9', fontSize: 20 }}>{f.icon}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8f5ef', margin: '0 0 6px', letterSpacing: '-0.01em' }}>{f.title}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(232,245,239,0.45)', lineHeight: 1.7, margin: 0 }}>{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ── */}
      <section style={{ padding: '100px clamp(1.5rem, 5vw, 5rem)', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5d0b9', opacity: 0.7 }}>Three portals. One system.</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '12px 0 0', color: '#e8f5ef' }}>
              Every stakeholder has their own view.
            </h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { role: 'admin', icon: 'settings', title: 'Organizer Console', desc: 'Full command: configure stages, approve teams, monitor scores, manage communications, advance the event.', cta: 'Open Console', color: '#a5d0b9' },
            { role: 'judge', icon: 'gavel', title: 'Judge Portal', desc: 'Distraction-free evaluation interface. Score teams, submit feedback, access rubrics generated per team by AI.', cta: 'Judge Interface', color: '#7bb8a4' },
            { role: 'participant', icon: 'person', title: 'Participant Portal', desc: 'Track your event stage, view team details, see evaluation status, and receive updates as they happen.', cta: 'Participant View', color: '#5da091' },
          ].map((p, i) => (
            <Reveal key={i} delay={i * 120}>
              <div style={{
                background: 'rgba(1,45,29,0.2)', border: '1px solid rgba(161,208,185,0.12)',
                borderRadius: 16, padding: '32px', overflow: 'hidden', position: 'relative',
                cursor: 'pointer', transition: 'border-color 0.3s, transform 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(161,208,185,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(161,208,185,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => onNavigate(p.role)}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${p.color}15`, border: `1px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <span className="material-symbols-outlined" style={{ color: p.color, fontSize: 24 }}>{p.icon}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#e8f5ef', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(232,245,239,0.45)', lineHeight: 1.7, margin: '0 0 24px' }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: p.color, fontSize: 13, fontWeight: 700 }}>
                  {p.cta}
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '80px clamp(1.5rem, 5vw, 5rem)' }}>
        <Reveal>
          <div style={{
            maxWidth: 860, margin: '0 auto', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(1,45,29,0.8) 0%, rgba(1,45,29,0.4) 100%)',
            border: '1px solid rgba(161,208,185,0.15)',
            borderRadius: 24, padding: '64px 48px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(161,208,185,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(161,208,185,0.05)', pointerEvents: 'none' }} />

            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5d0b9', opacity: 0.7 }}>Ready to start</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, color: '#e8f5ef', margin: '12px 0 16px', letterSpacing: '-0.03em' }}>
              Your next event runs itself.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(232,245,239,0.5)', maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.7 }}>
              Sign in, describe your event, and ORCHESTR handles the rest — from team formation to final results.
            </p>
            <button onClick={() => onNavigate('admin')}
              style={{
                background: '#a5d0b9', color: '#012d1d', border: 'none',
                borderRadius: 12, padding: '16px 36px', fontSize: 16, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 10,
                boxShadow: '0 0 60px rgba(165,208,185,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>rocket_launch</span>
              Get Started Free
            </button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(161,208,185,0.08)',
        padding: '32px clamp(1.5rem, 5vw, 5rem)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#012d1d', border: '1px solid rgba(161,208,185,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#a5d0b9', fontSize: 13 }}>terminal</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#e8f5ef' }}>ORCHESTR</span>
          <span style={{ fontSize: 12, color: 'rgba(232,245,239,0.3)', marginLeft: 8 }}>© 2025 Wise Innovation Ecosystem</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Support', 'Contact'].map(l => (
            <button key={l} style={{ background: 'none', border: 'none', color: 'rgba(232,245,239,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>{l}</button>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes float { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-6px); } }
        .nav-link:hover { color: rgba(232,245,239,0.9) !important; }
        * { box-sizing: border-box; }
        /* Responsive nav */
        .nav-desktop-links { display: flex; }
        .nav-desktop-cta { display: flex; }
        .nav-mobile-hamburger { display: none; }
        .nav-mobile-menu { display: flex; }
        @media (max-width: 640px) {
          .nav-desktop-links { display: none !important; }
          .nav-desktop-cta { display: none !important; }
          .nav-mobile-hamburger { display: block !important; }
        }
        @media (min-width: 641px) {
          .nav-mobile-menu { display: none !important; }
          .nav-mobile-hamburger { display: none !important; }
        }
      `}</style>
    </div>
  );
}
