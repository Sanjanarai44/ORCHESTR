import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import OrganizerLogin from './pages/OrganizerLogin';
import EventSelector from './pages/EventSelector';
import EventsetupPage from './pages/EventsetupPage';
import AdminDashboard from './pages/AdminDashboard';
import JudgeDashboard from './pages/JudgeDashboard';
import JudgeVerify from './pages/JudgeVerify';
import JudgeEvaluate from './pages/JudgeEvaluate';
import ParticipantDashboard from './pages/ParticipantDashboard';

function App() {
  const [view, setView] = useState('landing');
  const [organizer, setOrganizer] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [judgeToken, setJudgeToken] = useState(null);
  const [judgeName, setJudgeName] = useState('');
  const [judgeTeamId, setJudgeTeamId] = useState(null);

  useEffect(() => {
    // Restore organizer session
    try {
      const saved = localStorage.getItem('organizer');
      if (saved) setOrganizer(JSON.parse(saved));
      const savedEvent = localStorage.getItem('current_event');
      if (savedEvent) setCurrentEvent(JSON.parse(savedEvent));
    } catch {}

    // Magic link detection — judge clicks emailed link
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, '', '/');
      localStorage.setItem('judge_token', token);
      setJudgeToken(token);
      setView('judge-verify');
    }
  }, []);

  useEffect(() => {
    if (currentEvent) localStorage.setItem('current_event', JSON.stringify(currentEvent));
    else localStorage.removeItem('current_event');
  }, [currentEvent]);

  const handleLandingNavigate = (role) => {
    if (role === 'admin') {
      if (organizer) setView(currentEvent ? 'admin' : 'events');
      else setView('login');
    } else {
      setView(role);
    }
  };

  const handleLogin = (org) => {
    setOrganizer(org);
    localStorage.setItem('organizer', JSON.stringify(org));
    setView('events');
  };

  const handleLogout = () => {
    setOrganizer(null);
    setCurrentEvent(null);
    localStorage.removeItem('organizer');
    localStorage.removeItem('current_event');
    setView('landing');
  };

  const handleSelectEvent = (event) => {
    const cfg = typeof event.config === 'string' ? JSON.parse(event.config) : event.config;
    setCurrentEvent({ id: event.id, config: cfg });
    setView('admin');
  };

  const handleNewEvent = () => {
    setCurrentEvent(null);
    setView('event-setup');
  };

  const handleEventConfigured = async (config) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_AI_URL || 'https://orchestr-ai.onrender.com'}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_id: organizer.id, config }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentEvent({ id: data.event_id, config });
        setView('admin');
      }
    } catch {
      setCurrentEvent({ id: null, config });
      setView('admin');
    }
  };

  const handleJudgeVerified = (name) => {
    setJudgeName(name);
    const token = localStorage.getItem('judge_token');
    setJudgeToken(token);
    setView('judge-dashboard');
  };

  const eventConfig = currentEvent?.config || null;
  const eventId = currentEvent?.id || 1;

  switch (view) {
    case 'login':
      return <OrganizerLogin onLogin={handleLogin} />;

    case 'events':
      return (
        <EventSelector
          organizer={organizer}
          onSelectEvent={handleSelectEvent}
          onNewEvent={handleNewEvent}
          onLogout={handleLogout}
        />
      );

    case 'event-setup':
      return (
        <EventsetupPage
          onComplete={handleEventConfigured}
          onBack={() => setView(organizer ? 'events' : 'landing')}
        />
      );

    case 'admin':
      return (
        <AdminDashboard
          eventConfig={eventConfig}
          eventId={eventId}
          organizer={organizer}
          onBack={() => setView('events')}
          onLogout={handleLogout}
        />
      );

    case 'judge-verify':
      return (
        <JudgeVerify
          token={judgeToken || localStorage.getItem('judge_token')}
          onSuccess={handleJudgeVerified}
        />
      );

    case 'judge-dashboard':
      return (
        <JudgeDashboard
          judgeName={judgeName}
          judgeToken={judgeToken}
          eventConfig={eventConfig}
          eventId={eventId}
          onEvaluateTeam={(teamId) => {
            setJudgeTeamId(teamId);
            setView('judge-evaluate');
          }}
          onBack={() => setView('landing')}
        />
      );

    case 'judge-evaluate':
      return (
        <JudgeEvaluate
          judgeName={judgeName}
          judgeToken={judgeToken}
          initialTeamId={judgeTeamId}
          onBack={() => setView('judge-dashboard')}
        />
      );

    case 'judge':
      return (
        <JudgeDashboard
          judgeName="Demo Judge"
          judgeToken={null}
          eventConfig={eventConfig}
          eventId={eventId}
          onEvaluateTeam={(teamId) => {
            setJudgeTeamId(teamId);
            setView('judge-evaluate');
          }}
          onBack={() => setView('landing')}
        />
      );

    case 'participant':
      return (
        <ParticipantDashboard
          eventConfig={eventConfig}
          eventId={eventId}
          onBack={() => setView('landing')}
        />
      );

    case 'landing':
    default:
      return <LandingPage onNavigate={handleLandingNavigate} organizer={organizer} />;
  }
}

export default App;
