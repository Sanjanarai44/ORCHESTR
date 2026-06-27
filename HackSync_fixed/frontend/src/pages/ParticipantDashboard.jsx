import React, { useState, useEffect, useRef } from 'react';
import EventJourney from '../components/participant/EventJourney';
import ParticipantSidebar from '../components/participant/ParticipantSidebar';
import ParticipantHeader from '../components/participant/ParticipantHeader';
import WelcomeHero from '../components/participant/WelcomeHero';
import TimelineTracker from '../components/participant/TimelineTracker';
import TeamAndResources from '../components/participant/TeamAndResources';
import GithubRepoSubmission from '../components/participant/GithubRepoSubmission';
import AIMentor from './AIMentor';
import ParticipantLeaderboard from '../components/participant/ParticipantLeaderboard';
import WorkflowTracker from '../components/shared/WorkflowTracker';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';
const AI = import.meta.env.VITE_AI_URL || 'https://orchestr-ai.onrender.com';

const STAGES = [
  { key: 'registered', label: 'Registered', icon: 'how_to_reg' },
  { key: 'development', label: 'Development', icon: 'code' },
  { key: 'evaluation', label: 'Evaluation', icon: 'analytics' },
  { key: 'demo', label: 'Demo', icon: 'workspace_premium' },
  { key: 'final', label: 'Final', icon: 'stars' },
];

const STAGE_MAP = {
  roster: 'development',
  development: 'development',
  evaluation: 'evaluation',
  demo: 'demo',
  final: 'final',
};

export default function ParticipantDashboard({ eventConfig, eventId, authenticatedParticipant }) {
  const [participant, setParticipant] = useState(authenticatedParticipant || {
    id: 'demo-123',
    name: 'Demo Participant',
    email: 'demo@example.com',
    college: 'Demo University',
    skill: 'Frontend',
    stage: 'roster'
  });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAIMentor, setShowAIMentor] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 28, minutes: 44, seconds: 12 });
  const [team, setTeam] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compatibilitySummary, setCompatibilitySummary] = useState('');
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [evaluator, setEvaluator] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleInviteResponse = async (response) => {
    try {
      await fetch(`${NODE}/api/participants/${participant.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      setParticipant(prev => ({ ...prev, inviteStatus: response }));
    } catch (err) {
      console.error('Response failed:', err);
    }
  };

  const scrollContainerRef = useRef(null);
  const sectionRefs = {
    dashboard: useRef(null),
    timeline: useRef(null),
    teams: useRef(null),
  };

  // ── Refresh function — callable from WelcomeHero ─────────────────────────
  const loadParticipantData = async () => {
    if (!participant || participant.id?.startsWith('demo-')) return;
    try {
      const pRes = await fetch(`${NODE}/api/admin/participants/${participant.id}`);
      const pData = await pRes.json();
      if (pData.success) {
        setParticipant(prev => ({ ...prev, ...pData.participant }));
        setNotifications(pData.notifications || []);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
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
        let currentEmail = participant.email;
        let currentEventId = eventId || eventConfig?.id;

        if (participant.id && participant.id.startsWith('demo-')) {
          setNotifications([]);
        } else {
          const pRes = await fetch(`${NODE}/api/admin/participants/${participant.id}`);
          const pData = await pRes.json();
          if (pData.success) {
            setParticipant(prev => ({ ...prev, ...pData.participant }));
            setNotifications(pData.notifications || []);
            currentEmail = pData.participant.email || currentEmail;
            currentEventId = currentEventId || pData.participant.eventId;
          }
        }

        const targetEventId = currentEventId || participant.eventId || 1;
        const tRes = await fetch(`${NODE}/api/admin/teams?status=PUBLISHED&eventId=${targetEventId}`);
        const tData = await tRes.json();
        const teams = tData.teams || [];

        let myTeam = teams.find(t =>
          t.members?.some(m => m.email === currentEmail)
        );

        if (!myTeam) {
          const dRes = await fetch(`${NODE}/api/admin/teams?status=DRAFT&eventId=${targetEventId}`);
          const dData = await dRes.json();
          myTeam = (dData.teams || []).find(t =>
            t.members?.some(m => m.email === currentEmail)
          );
        }

        if (!myTeam && participant.id?.startsWith('demo-')) {
          myTeam = {
            id: 'demo-team-1',
            name: 'Quantum Pioneers',
            status: 'PUBLISHED',
            members: [
              { name: participant.name, email: participant.email, skill: participant.skill },
              { name: 'Alice Chen', email: 'alice@example.com', skill: 'Backend' },
              { name: 'Bob Smith', email: 'bob@example.com', skill: 'AI/ML' }
            ]
          };
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

  useEffect(() => {
    if (!team?.members?.length) return;

    async function generateSummary() {
      setCompatibilityLoading(true);
      try {
        const res = await fetch(`${AI}/compatibility-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_name: team.name, members: team.members }),
        });
        const data = await res.json();
        setCompatibilitySummary(data.summary || '');
      } catch (err) {
        console.error('Compatibility error:', err);
        setCompatibilitySummary('This team combines complementary technical and creative skills.');
      } finally {
        setCompatibilityLoading(false);
      }
    }

    generateSummary();
  }, [team]);

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
      <ParticipantSidebar
        activeSection={activeSection}
        onNavClick={handleNavClick}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 md:ml-64 overflow-y-auto scroll-smooth flex flex-col h-screen"
      >
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-[#012d1d] text-white h-14 flex items-center px-4 gap-3 shadow-md flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <span className="font-bold text-[#eafdff] text-base">Wise@TI — Participant</span>
        </div>

        <ParticipantHeader participant={participant} onLogout={() => setParticipant(null)} />

        {showAIMentor ? (
          <div className="flex-1 p-4 sm:p-6 overflow-hidden">
            <AIMentor
              eventId={eventConfig?.id || eventId || 1}
              teamId={team?.id}
              teamName={team?.name}
              participantId={participant?.id}
              onBack={() => setShowAIMentor(false)}
            />
          </div>
        ) : (
          <div className="px-4 sm:px-8 lg:px-16 py-2 space-y-12 pb-24">
            <div ref={sectionRefs.dashboard} id="dashboard" className="pt-4">
              <WelcomeHero
                participant={participant}
                notifications={notifications}
                eventConfig={eventConfig}
                onInviteResponse={handleInviteResponse}
                onRefresh={loadParticipantData}
              />
            </div>

            <div ref={sectionRefs.timeline} id="timeline" className="scroll-mt-6 space-y-10">
              <SimpleStageTracker participant={participant} />
              <EventJourney participant={participant} eventConfig={eventConfig} />
            </div>

            <div ref={sectionRefs.teams} id="teams" className="scroll-mt-6 space-y-6">
              <TeamAndResources
                team={team}
                eventConfig={eventConfig}
                compatibilitySummary={compatibilitySummary}
                compatibilityLoading={compatibilityLoading}
                onOpenAIMentor={() => setShowAIMentor(true)}
                leaderboard={null}
              />
              {team?.id && !String(team.id).startsWith('demo-') && (
                <GithubRepoSubmission
                  team={team}
                  onUpdated={(url) => setTeam(prev => prev ? { ...prev, githubRepoUrl: url } : prev)}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );

  function SimpleStageTracker({ participant }) {
    const rawStage = participant?.stage || 'roster';
    const currentStage = STAGE_MAP[rawStage] || rawStage;
    const currentIndex = STAGES.findIndex(s => s.key === currentStage);

    return (
      <div className="bg-white rounded-2xl border border-[#c1c8c2]/30 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#012d1d] mb-6">Your Progress</h2>

        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-[2px] bg-[#d9e6df]" />
          <div
            className="absolute top-5 left-0 h-[2px] bg-[#012d1d] transition-all"
            style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          />

          {STAGES.map((stage, idx) => {
            const isDone = idx <= currentIndex;
            const isActive = idx === currentIndex;

            return (
              <div key={stage.key} className="flex flex-col items-center z-10">
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border
                  ${isDone ? 'bg-[#012d1d] text-white' : 'bg-white text-[#012d1d]'}
                  ${isActive ? 'ring-4 ring-[#c1ecd4]' : ''}
                `}>
                  <span className="material-symbols-outlined text-[14px] sm:text-[18px]">{stage.icon}</span>
                </div>
                <p className="text-[9px] sm:text-[11px] mt-2 text-center text-[#414844] hidden sm:block">{stage.label}</p>
              </div>
            );
          })}
        </div>

        {/* Stage labels on mobile as a single row below */}
        <div className="flex justify-between mt-4 sm:hidden">
          {STAGES.map((stage, idx) => (
            <p key={stage.key} className={`text-[9px] text-center text-[#414844] flex-1 ${idx <= currentIndex ? 'font-bold text-[#012d1d]' : ''}`}>
              {stage.label}
            </p>
          ))}
        </div>
      </div>
    );
  }
}
