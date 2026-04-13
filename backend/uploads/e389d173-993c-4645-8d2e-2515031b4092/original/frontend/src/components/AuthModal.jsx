import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { login, register } from '../api/client';

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = mode === 'login' ? login : register;
      const data = await fn(email, password, name);
      onAuth(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={e => e.stopPropagation()} id="auth-modal">
        <button className="modal-close" onClick={onClose}><X size={18} /></button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
            {mode === 'login' ? 'Sign in to save your analysis history' : 'Join to save analyses and unlock full features'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="input-group">
              <User size={16} className="input-icon" />
              <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} id="auth-name" />
            </div>
          )}
          <div className="input-group">
            <Mail size={16} className="input-icon" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required id="auth-email" />
          </div>
          <div className="input-group">
            <Lock size={16} className="input-icon" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} id="auth-password" />
          </div>

          <button type="submit" className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} disabled={loading} id="auth-submit">
            {loading ? 'Please wait...' : mode === 'login' ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Sign Up</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>Don't have an account? <button className="link-btn" onClick={() => { setMode('register'); setError(''); }}>Sign up</button></>
          ) : (
            <>Already have an account? <button className="link-btn" onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
