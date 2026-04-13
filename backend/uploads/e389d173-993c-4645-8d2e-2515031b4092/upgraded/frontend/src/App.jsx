import React, { useState, useEffect } from 'react';
import { Upload, Database, LogIn, LogOut, User, Clock } from 'lucide-react';
import { uploadFileStream, getProfile } from './api/client';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import HistoryPage from './components/HistoryPage';

export default function App() {
  const [stage, setStage] = useState('upload'); // upload | processing | dashboard | history
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [filename, setFilename] = useState('');
  const [processingSteps, setProcessingSteps] = useState([]);

  // Auth state
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('dataflow_token');
    if (token) {
      getProfile().then(res => setUser(res.user)).catch(() => {
        localStorage.removeItem('dataflow_token');
      });
    }
  }, []);

  const handleAuth = (token, userData) => {
    localStorage.setItem('dataflow_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('dataflow_token');
    setUser(null);
  };

  const handleUpload = async (file) => {
    setFilename(file.name);
    setError(null);
    setProcessingSteps([]);
    setStage('processing');

    try {
      const data = await uploadFileStream(file, (progressEvent) => {
        setProcessingSteps(prev => {
          const existing = prev.find(s => s.step === progressEvent.step);
          if (existing) {
            return prev.map(s => s.step === progressEvent.step ? { ...s, ...progressEvent } : s);
          }
          return [...prev, progressEvent];
        });
      });
      setResults(data);
      setStage('dashboard');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Processing failed.';
      setError(message);
      setStage('upload');
    }
  };

  const handleLoadFromHistory = (data) => {
    setResults(data);
    setFilename(data.filename);
    setStage('dashboard');
  };

  const handleReset = () => {
    setStage('upload');
    setResults(null);
    setError(null);
    setFilename('');
    setProcessingSteps([]);
  };

  const handleLoginRequired = () => {
    setShowAuth(true);
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <div className="navbar-logo"><Database size={18} /></div>
          DataFlow AI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {stage === 'dashboard' && (
            <button className="navbar-action-btn" onClick={handleReset} id="new-analysis-btn"><Upload size={14} /> New Analysis</button>
          )}

          <button
            className="navbar-action-btn"
            onClick={() => { setStage(stage === 'history' ? 'upload' : 'history'); }}
            id="history-btn"
            style={stage === 'history' ? { borderColor: 'var(--accent)', color: 'var(--accent-light)' } : {}}
          >
            <Clock size={14} /> History
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.name || user.email}</span>
              <button className="navbar-action-btn" onClick={handleLogout}><LogOut size={14} /></button>
            </div>
          ) : (
            <button className="navbar-action-btn" onClick={() => setShowAuth(true)} id="login-btn">
              <LogIn size={14} /> Sign In
            </button>
          )}

          <div className="navbar-status"><div className="navbar-dot" />Ready</div>
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}

      {/* Main Content */}
      <div className="app-container">
        {error && (
          <div className="error-banner animate-in" role="alert">
            ⚠️ {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {stage === 'upload' && <FileUpload onUpload={handleUpload} user={user} onLoginRequired={handleLoginRequired} />}
        {stage === 'processing' && <ProcessingStatus filename={filename} steps={processingSteps} />}
        {stage === 'dashboard' && results && <Dashboard results={results} filename={filename} />}
        {stage === 'history' && <HistoryPage onLoadDataset={handleLoadFromHistory} />}
      </div>
    </>
  );
}
