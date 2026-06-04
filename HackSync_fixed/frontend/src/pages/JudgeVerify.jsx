import React, { useEffect, useState, useRef } from 'react';
import { judgeApi } from '../api';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

const Wrapper = ({ children }) => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
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

export default function JudgeVerify({ onSuccess, token }) {
  const [state, setstate] = useState('loading'); // 'loading' | 'otp' | 'success' | 'error'
  const [errorType, setErrorType] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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

    const requestOtp = async () => {
      try {
        const res = await fetch(`${NODE}/api/otp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, role: 'judge' })
        });
        const data = await res.json();
        
        if (data.success) {
          setMaskedEmail(data.maskedEmail);
          setstate('otp');
        } else {
          // If it fails, maybe token is invalid or no email is set.
          throw new Error(data.detail || 'Failed to send OTP');
        }
      } catch (err) {
        const detail = err.message || 'Verification failed.';
        if (detail.includes('409') || detail.toLowerCase().includes('already used')) {
          setErrorType('used');
        } else if (detail.toLowerCase().includes('expired')) {
          setErrorType('expired');
        } else {
          setErrorType('invalid');
        }
        setErrorMessage(detail);
        setstate('error');
      }
    };

    requestOtp();
  }, [token]);

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setVerifyingOtp(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${NODE}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role: 'judge', code: otpCode.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        setstate('success');
        setTimeout(() => {
          if (onSuccess) onSuccess(data.userName);
        }, 1200);
      } else {
        setErrorMessage(data.detail || 'Invalid OTP code.');
      }
    } catch (err) {
      setErrorMessage('Error verifying OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };



  if (state === 'loading') {
    return (
      <Wrapper>
        <div className="p-12 text-center space-y-6">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 border-4 border-stone-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Verifying link & sending OTP…</h2>
            <p className="text-sm text-stone-500 mt-1">Please wait while we validate your access token.</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  if (state === 'otp') {
    return (
      <Wrapper>
        <div className="p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-blue-600 text-4xl">mail</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Two-Step Verification</h2>
            <p className="text-sm text-stone-500 mt-1">We sent a 6-digit code to your email {maskedEmail}.</p>
          </div>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Enter 6-digit code" 
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
              className="w-full text-center tracking-widest text-lg font-mono py-3 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900"
            />
            {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
            
            <button 
              onClick={handleVerifyOtp}
              disabled={!otpCode || verifyingOtp}
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
            >
              {verifyingOtp ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </div>
        </div>
      </Wrapper>
    );
  }

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
      helpText: 'Your access window has passed. Contact the organizer for a fresh link.',
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
        <a href="mailto:organizer@algorythm.com" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 hover:underline">
          <span className="material-symbols-outlined text-[18px]">mail</span>
          Contact organizer
        </a>
      </div>
    </Wrapper>
  );
}
