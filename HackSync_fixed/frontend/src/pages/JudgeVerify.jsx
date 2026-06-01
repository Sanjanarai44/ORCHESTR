import React, { useEffect, useState, useRef } from 'react';

/**
 * JudgeVerify Page — /judge/verify?token=xxx
 *
 * Shows a loading spinner, then:
 * - On success: redirects to judge evaluate view
 * - On error: shows the specific error message with instructions
 */
export default function JudgeVerify({ onSuccess, token }) {
  const [state, setstate] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorType, setErrorType] = useState(null); // 'used' | 'expired' | 'invalid'
  const [errorMessage, setErrorMessage] = useState('');

  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setstate('error');
      setErrorType('invalid');
      setErrorMessage('No token provided. Use the original link from your email.');
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    const verify = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com'}/api/judge/verify?token=${encodeURIComponent(token)}`,
          { credentials: 'include' }
        );
        const data = await res.json();

        if (!res.ok) {
          const detail = data.detail || 'Verification failed.';
          if (res.status === 409) {
            setErrorType('used');
          } else if (detail.toLowerCase().includes('expired')) {
            setErrorType('expired');
          } else {
            setErrorType('invalid');
          }
          setErrorMessage(detail);
          setstate('error');
          return;
        }

        setstate('success');
        // Small delay for visual confirmation, then navigate
        setTimeout(() => {
          if (onSuccess) onSuccess(data.judgeName);
        }, 1200);
      } catch (err) {
        setErrorType('invalid');
        setErrorMessage('Network error. Please check your connection and try again.');
        setstate('error');
      }
    };

    verify();
  }, [token]);

  // ── Shared layout wrapper ─────────────────────────────────────────────────
  const Wrapper = ({ children }) => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            AlgoRythm EventFlow
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <Wrapper>
        <div className="p-12 text-center space-y-6">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 border-4 border-stone-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Verifying your link…</h2>
            <p className="text-sm text-stone-500 mt-1">Please wait while we validate your access token.</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <Wrapper>
        <div className="p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-emerald-600 text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Access granted!</h2>
            <p className="text-sm text-stone-500 mt-1">Redirecting to the judge portal…</p>
          </div>
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-[grow_1.2s_ease-in-out_forwards]" />
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  const errorConfig = {
    used: {
      icon: 'link_off',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      title: 'Link already used',
      helpText: 'Each magic link is single-use for security. If you need access again, contact the event organizer to send a new link.',
    },
    expired: {
      icon: 'schedule',
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      title: 'Link expired',
      helpText: 'Your 48-hour access window has passed. Contact the organizer for a fresh evaluation link.',
    },
    invalid: {
      icon: 'warning',
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      title: 'Invalid link',
      helpText: 'This link appears to be invalid or tampered with. Please use the original link from your email.',
    },
  };

  const cfg = errorConfig[errorType] || errorConfig.invalid;

  return (
    <Wrapper>
      <div className="p-12 text-center space-y-5">
        <div className={`w-16 h-16 ${cfg.bgColor} rounded-full flex items-center justify-center mx-auto`}>
          <span className={`material-symbols-outlined ${cfg.iconColor} text-4xl`}>{cfg.icon}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{cfg.title}</h2>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">{errorMessage}</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-4 text-left">
          <p className="text-xs text-stone-600 leading-relaxed">{cfg.helpText}</p>
        </div>
        <a
          href="mailto:organizer@algorythm.com"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">mail</span>
          Contact organizer
        </a>
      </div>
    </Wrapper>
  );
}
