import React, { useState, useEffect } from 'react';
import { Check, Loader, Zap } from 'lucide-react';

const DEFAULT_STEPS = [
  { step: 'upload', label: 'Uploading File', agent: 'Agent 2 · Backend', icon: '📁' },
  { step: 'clean', label: 'Cleaning Data', agent: 'Agent 5 · Cleaner', icon: '🧹' },
  { step: 'orchestrate', label: 'Planning Pipeline', agent: 'Orchestrator', icon: '🧩' },
  { step: 'analyze', label: 'Analyzing Patterns', agent: 'Agent 6 · Analyzer', icon: '🔍' },
  { step: 'anomaly', label: 'Detecting Anomalies', agent: 'Anomaly Detector', icon: '⚠️' },
  { step: 'visualize', label: 'Generating Charts', agent: 'Agent 7 · Visualizer', icon: '📊' },
  { step: 'predict', label: 'Making Predictions', agent: 'Agent 8 · Predictor', icon: '🔮' },
  { step: 'memory', label: 'Checking History', agent: 'Memory Agent', icon: '🧠' },
  { step: 'report', label: 'Compiling Report', agent: 'Agent 9 · Reporter', icon: '📝' },
];

export default function ProcessingStatus({ filename, steps = [] }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedMs(e => e + 100), 100);
    return () => clearInterval(timer);
  }, []);

  // Merge real SSE steps with default steps
  const stepMap = {};
  steps.forEach(s => { stepMap[s.step] = s; });

  const completedSteps = new Set(steps.filter(s => s.status === 'complete').map(s => s.step));
  const activeStep = steps.filter(s => s.status === 'started').map(s => s.step).pop();

  // Find the furthest completed step
  let furthestIdx = -1;
  DEFAULT_STEPS.forEach((ds, i) => {
    if (completedSteps.has(ds.step)) furthestIdx = i;
  });

  return (
    <div className="processing-page">
      <div className="processing-card card animate-in">
        <div className="processing-spinner" />
        <h2 className="processing-title">Processing Pipeline</h2>
        <p className="processing-subtitle">
          Analyzing <strong>{filename}</strong>
          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {(elapsedMs / 1000).toFixed(1)}s elapsed
          </span>
        </p>

        <div className="processing-steps">
          {DEFAULT_STEPS.map((ds, i) => {
            const isCompleted = completedSteps.has(ds.step);
            const isActive = ds.step === activeStep || (!activeStep && i === furthestIdx + 1 && furthestIdx < DEFAULT_STEPS.length - 1);
            const realStep = stepMap[ds.step];

            return (
              <div key={ds.step} className={`processing-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                <div className="step-indicator">
                  {isCompleted ? <Check size={16} /> : isActive ? <Loader size={16} className="spinning" /> : <span style={{ fontSize: '0.85rem' }}>{ds.icon}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="step-label">{ds.label}</div>
                  <div className="step-agent">{ds.agent}</div>
                </div>
                {isCompleted && realStep?.message && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', maxWidth: '180px', textAlign: 'right' }}>
                    {realStep.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <Zap size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Real-time streaming from the pipeline
        </div>
      </div>
    </div>
  );
}
