import React, { useState, useEffect, useRef } from 'react';
import JudgeSidebar from '../components/judge/JudgeSidebar';
import EvaluationHero from '../components/judge/EvaluationHero';
import EvaluationQueue from '../components/judge/EvaluationQueue';
import JudgeResources from '../components/judge/JudgeResources';
import ActivityAndMentors from '../components/judge/ActivityAndMentors';
import { judgeApi } from '../api';

const POLL_INTERVAL = 30000; // 30 seconds real-time refresh

export default function JudgeDashboard({ judgeName, judgeToken, onBack, onEvaluateTeam }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 48, seconds: 12 });
  const [teams, setTeams] = useState([]);
  const [teamScores, setTeamScores] = useState({});
  const [progress, setProgress] = useState({ evaluated: 0, total: 0, percent: 0, nextTeam: null });
  const [error, setError] = useState(null);

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

  return (
    <div className="bg-[#F5F3F0] min-h-screen text-[#031f22] font-sans antialiased">
      <JudgeSidebar />

      <main className="ml-64 min-h-screen px-16 py-12 flex flex-col gap-20">
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

        <section id="resources">
          <JudgeResources />
        </section>

        <section id="activity">
          <ActivityAndMentors />
        </section>
      </main>
    </div>
  );
}
