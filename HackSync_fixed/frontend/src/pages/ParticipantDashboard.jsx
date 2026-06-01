import React, { useState, useEffect, useRef } from 'react';
import EventJourney from '../components/participant/EventJourney';
import ParticipantSidebar from '../components/participant/ParticipantSidebar';
import ParticipantHeader from '../components/participant/ParticipantHeader';
import WelcomeHero from '../components/participant/WelcomeHero';
import TimelineTracker from '../components/participant/TimelineTracker';
import TeamAndResources from '../components/participant/TeamAndResources';

const NODE = 'http://localhost:5000';

// ── Email login gate ─────────────────────────────────────────────────────────
function EmailGate({ onFound }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      // FIXED: correct API path /api/admin/participants/by-email/
      const res = await fetch(
        `${NODE}/api/admin/participants/by-email/${encodeURIComponent(email.trim().toLowerCase())}`
      );
      const data = await res.json();
      if (data.found && data.participant) {
        onFound(data.participant);
      } else {
        setError('No participant found with that email. Check with your event organizer.');
      }
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eafdff] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#c1c8c2]/30 p-10 w-full max-w-md">
        <div className="w-12 h-12 rounded-xl bg-[#012d1d] flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[#c1ecd4] text-[22px]">badge</span>
        </div>
        <h1 className="text-2xl font-bold text-[#012d1d] mb-1">Participant Portal</h1>
        <p className="text-sm text-[#414844] mb-8">Enter your registered email to access your event dashboard.</p>

        <label className="text-xs font-bold uppercase tracking-widest text-[#414844] block mb-2">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          placeholder="you@example.com"
          className="w-full border border-[#c1c8c2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#012d1d] mb-3"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <button
          onClick={handleLookup}
          disabled={loading || !email.trim()}
          className="w-full bg-[#012d1d] hover:bg-[#023d29] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[18px]">login</span>}
          {loading ? 'Looking up...' : 'Access My Dashboard'}
        </button>

        <p className="text-xs text-[#414844]/60 text-center mt-4">
          Your email must be in the participant roster. Contact your organizer if you have trouble.
        </p>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function ParticipantDashboard({ eventConfig }) {
  const [participant, setParticipant] = useState(null); // full participant object
  const [activeSection, setActiveSection] = useState('dashboard');
  const [countdown, setCountdown] = useState({ hours: 28, minutes: 44, seconds: 12 });
  const [timeline, setTimeline] = useState([]);
  const [team, setTeam] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrollContainerRef = useRef(null);
  const sectionRefs = {
    dashboard: useRef(null),
    timeline: useRef(null),
    teams: useRef(null),
  };

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { clearInterval(timer); return { hours: 0, minutes: 0, seconds: 0 }; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load full dashboard data after participant is found
  useEffect(() => {
    if (!participant) return;
    setLoading(true);

    async function load() {
      try {
        // Get full participant data including stage
        const pRes = await fetch(`${NODE}/api/admin/participants/${participant.id}`);
        const pData = await pRes.json();
        if (pData.success) {
          setParticipant(prev => ({ ...prev, ...pData.participant }));
          setTimeline(pData.timeline || []);
          setNotifications(pData.notifications || []);
        }

        // Load ALL published teams and find the participant's team
        const tRes = await fetch(`${NODE}/api/admin/teams?status=PUBLISHED`);
        const tData = await tRes.json();
        const teams = tData.teams || [];

        // Also check DRAFT teams if not found in PUBLISHED
        let myTeam = teams.find(t =>
          t.members?.some(m => m.email === participant.email)
        );

        if (!myTeam) {
          const dRes = await fetch(`${NODE}/api/admin/teams?status=DRAFT`);
          const dData = await dRes.json();
          myTeam = (dData.teams || []).find(t =>
            t.members?.some(m => m.email === participant.email)
          );
        }

        setTeam(myTeam || null);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [participant?.id]);

  // Scroll spy
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const timelineTop = sectionRefs.timeline.current?.offsetTop - 120 || Infinity;
    const teamsTop = sectionRefs.teams.current?.offsetTop - 120 || Infinity;
    if (scrollTop >= teamsTop) setActiveSection('teams');
    else if (scrollTop >= timelineTop) setActiveSection('timeline');
    else setActiveSection('dashboard');
  };

  const handleNavClick = (e, id) => {
    e.preventDefault();
    const el = sectionRefs[id]?.current;
    if (el && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: el.offsetTop - 30, behavior: 'smooth' });
    }
  };

  // Show email gate if no participant selected
  if (!participant) {
    return <EmailGate onFound={(p) => setParticipant(p)} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#eafdff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#012d1d] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#414844]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#eafdff] h-screen overflow-hidden flex font-sans antialiased text-[#031f22]">
      <ParticipantSidebar activeSection={activeSection} onNavClick={handleNavClick} eventConfig={eventConfig} />

      <main ref={scrollContainerRef} onScroll={handleScroll}
        className="flex-1 ml-64 overflow-y-auto scroll-smooth">
        <ParticipantHeader participant={participant} onLogout={() => setParticipant(null)} />

        <div className="px-16 py-2 space-y-12 pb-24">
          <div ref={sectionRefs.dashboard} id="dashboard" className="pt-4">
            <WelcomeHero participant={participant} notifications={notifications} eventConfig={eventConfig} />
          </div>

          <div ref={sectionRefs.timeline} id="timeline" className="scroll-mt-6 space-y-10">
            <TimelineTracker countdown={countdown} timeline={timeline} eventConfig={eventConfig} />
            <EventJourney participant={participant} eventConfig={eventConfig} />
          </div>

          <div ref={sectionRefs.teams} id="teams" className="scroll-mt-6">
            <TeamAndResources team={team} eventConfig={eventConfig} />
          </div>
        </div>
      </main>
    </div>
  );
}
