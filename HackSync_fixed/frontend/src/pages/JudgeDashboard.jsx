import React, { useState, useEffect, useRef } from 'react';
import JudgeSidebar from '../components/judge/JudgeSidebar';
import EvaluationHero from '../components/judge/EvaluationHero';
import EvaluationQueue from '../components/judge/EvaluationQueue';
import JudgeResources from '../components/judge/JudgeResources';
import ActivityAndMentors from '../components/judge/ActivityAndMentors';
import JudgeFeedbackForm from '../components/judge/JudgeFeedbackForm';
import { judgeApi } from '../api';

const POLL_INTERVAL = 30000; // 30 seconds real-time refresh

export default function JudgeDashboard({ judgeName, judgeToken, onBack, onEvaluateTeam }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 48, seconds: 12 });
  const [teams, setTeams] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [teamScores, setTeamScores] = useState({});
  const [progress, setProgress] = useState({ evaluated: 0, total: 0, percent: 0, nextTeam: null });
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pollRef = useRef(null);

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load teams — FIXED: pass judgeToken correctly
  const loadTeams = async () => {
    if (!judgeToken) {
      setError('No judge token. Please access via the magic link in your email.');
      return;
    }
    try {
      const res = await judgeApi.getTeams(judgeToken);
      const teamList = res.teams || [];
      setTeams(teamList);
      setEventId(res.eventId);
      setError(null);

      // Compute progress
      const evaluated = teamList.filter(t => t.scored).length;
      const total = teamList.length;
      const percent = total ? Math.round((evaluated / total) * 100) : 0;
      const nextTeam = teamList.find(t => !t.scored);
      const scoreMap = {};
      teamList.forEach(t => {
        scoreMap[t.id] = t.submittedScores ? [t.submittedScores] : [];
      });
      setTeamScores(scoreMap);
      setProgress({ evaluated, total, percent, nextTeam: nextTeam?.name || null });
    } catch (e) {
      console.error('Failed to load judge teams:', e);
      setError('Failed to load assigned teams. ' + e.message);
    }
  };

  // Load on mount + poll for real-time updates
  useEffect(() => {
    loadTeams();
    pollRef.current = setInterval(loadTeams, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [judgeToken]);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#F5F3F0] min-h-screen text-[#031f22] font-sans antialiased">
      <JudgeSidebar
        activeSection={activeSection}
        onNavClick={handleNavClick}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-[#012d1d] text-white h-14 flex items-center px-4 gap-3 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <span className="font-bold text-[#eafdff] text-base">Wise@TI — Judge Portal</span>
      </div>

      <main className="md:ml-64 min-h-screen px-4 sm:px-8 lg:px-16 py-8 sm:py-12 flex flex-col gap-12 sm:gap-20">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <section id="dashboard">
          <EvaluationHero countdown={countdown} progress={progress} judgeName={judgeName} />
        </section>

        <section id="evaluation">
          <EvaluationQueue
            teams={teams}
            teamScores={teamScores}
            onSelectTeam={(team) => onEvaluateTeam(team.id)}
            onRefresh={loadTeams}
          />
        </section>

        <section id="feedback">
          <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#012d1d]">forum</span>
            Feedback
          </h2>
          <JudgeFeedbackForm 
            eventId={eventId} 
            judgeId={judgeName} 
            judgeName={judgeName} 
          />
        </section>

        <section id="resources">
          <JudgeResources />
        </section>

        <section id="activity" className="pb-12">
          <ActivityAndMentors />
        </section>
      </main>
    </div>
  );
}
