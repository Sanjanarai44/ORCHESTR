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
import ParticipantVerify from './pages/ParticipantVerify';
import { eventsApi } from './api';

function App() {
  const [view, setView] = useState('landing');
  const [organizer, setOrganizer] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [judgeToken, setJudgeToken] = useState(null);
  const [judgeName, setJudgeName] = useState('');
  const [judgeTeamId, setJudgeTeamId] = useState(null);
  
  const [participantToken, setParticipantToken] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [mentorTeam, setMentorTeam] = useState(null);
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const token = params.get("adminToken");
  const organizerParam = params.get("organizer");

  if (token && organizerParam) {
    const org = JSON.parse(decodeURIComponent(organizerParam));

    localStorage.setItem("adminToken", token);
    localStorage.setItem("organizer", JSON.stringify(org));

    window.history.replaceState({}, "", "/");

    setOrganizer(org);
    setView("events");
  }
}, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const judgeId = params.get('judge');
    const partToken = params.get('participantToken');

    if (token) {
      window.history.replaceState({}, '', '/');
      localStorage.removeItem('organizer');
      localStorage.removeItem('current_event');
      localStorage.setItem('judge_token', token);
      setJudgeToken(token);
      setView('judge-verify');
      return;
    }

    if (judgeId) {
      window.history.replaceState({}, '', '/');
      localStorage.removeItem('organizer');
      localStorage.removeItem('current_event');
      localStorage.setItem('judge_id', judgeId);
      setJudgeToken(judgeId);
      setView('judge-verify');
      return;
    }

    if (partToken) {
      window.history.replaceState({}, '', '/');
      localStorage.removeItem('organizer');
      localStorage.removeItem('current_event');
      localStorage.setItem('participant_token', partToken);
      setParticipantToken(partToken);
      setView('participant-verify');
      return;
    }

    try {
      const saved = localStorage.getItem('organizer');
      if (saved) {
        const org = JSON.parse(saved);
        setOrganizer(org);
        const savedEvent = localStorage.getItem('current_event');
        if (savedEvent) {
          setCurrentEvent(JSON.parse(savedEvent));
          setView('admin');
        } else {
          setView('events'); // go straight to events list, not landing
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentEvent) localStorage.setItem('current_event', JSON.stringify(currentEvent));
    else localStorage.removeItem('current_event');
  }, [currentEvent]);

  const handleLandingNavigate = (role) => {
    if (role === 'admin') {
      if (organizer) setView(currentEvent ? 'admin' : 'events');
      else setView('login');
    } else if (role === 'participant') {
      setView('participant');
    } else if (role === 'judge') {
      setView('judge');
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

  // Stores full event data including name + event_type so refresh works correctly
  const handleSelectEvent = (event) => {
    const cfg = typeof event.config === 'string' ? JSON.parse(event.config) : (event.config || {});
    const eventData = {
      id: event.id,
      name: event.name || cfg.event_name || 'Event',
      event_type: event.event_type || cfg.event_type || '',
      config: cfg,
    };
    setCurrentEvent(eventData);
    localStorage.setItem('current_event', JSON.stringify(eventData));
    setView('admin');
  };

  const handleNewEvent = () => {
    setCurrentEvent(null);
    setView('event-setup');
  };

  // Uses eventsApi (AI backend) instead of raw fetch to Node backend
  const handleEventConfigured = async (config) => {
    try {
      const data = await eventsApi.create({
        organizer_id: String(organizer?.id || '1'),
        config,
      });
      const eventId = data.event_id || data.id;
      const eventData = {
        id: eventId || `local_${Date.now()}`,
        name: config.event_name || 'New Event',
        event_type: config.event_type || '',
        config,
      };
      setCurrentEvent(eventData);
      localStorage.setItem('current_event', JSON.stringify(eventData));
      setView('admin');
    } catch (e) {
      console.error('handleEventConfigured FAILED:', e);
      // Fall back to local ID so user can still proceed
      const eventData = {
        id: `local_${Date.now()}`,
        name: config.event_name || 'New Event',
        event_type: config.event_type || '',
        config,
      };
      setCurrentEvent(eventData);
      localStorage.setItem('current_event', JSON.stringify(eventData));
      setView('admin');
    }
  };

  const handleJudgeVerified = (name) => {
    setJudgeName(name);
    const token = localStorage.getItem('judge_token') || localStorage.getItem('judge_id');
    setJudgeToken(token);
    setView('judge-dashboard');
  };

  const handleParticipantVerified = (userData) => {
    setParticipant({ id: userData.userId, name: userData.userName });
    setView('participant-dashboard');
  };

  const eventConfig = currentEvent?.config || null;
  const eventId = currentEvent?.id || null;

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
      if (!organizer) { setView('landing'); return null; }
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
      if (!judgeToken) { setView('landing'); return null; }
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
          onBack={() => {
            localStorage.removeItem('judge_token');
            localStorage.removeItem('judge_id');
            setJudgeToken(null);
            setJudgeName('');
            setView('landing');
          }}
        />
      );

    case 'judge-evaluate':
      if (!judgeToken) { setView('landing'); return null; }
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

    case 'participant-verify':
      return (
        <ParticipantVerify 
          token={participantToken || localStorage.getItem('participant_token')}
          onSuccess={handleParticipantVerified}
        />
      );

    case 'participant-dashboard':
      return (
        <ParticipantDashboard
          eventConfig={eventConfig}
          eventId={eventId}
          authenticatedParticipant={participant}
          onBack={() => setView('landing')}
        />
      );

    case 'participant':
      return (
        <ParticipantDashboard
          eventConfig={eventConfig}
          eventId={eventId}
          authenticatedParticipant={null}
          onBack={() => setView('landing')}
        />
      );

    case 'landing':
    default:
      return <LandingPage onNavigate={handleLandingNavigate} organizer={organizer} />;
  }
}

export default App;