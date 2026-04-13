import React from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(12, 12, 43, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '0.78rem',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
};

const AXIS_STYLE = { fontSize: '0.7rem', fill: '#64748b' };

export default function PredictionPanel({ predictions }) {
  if (!predictions?.predictions || predictions.predictions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No predictions available for this dataset.</p>
      </div>
    );
  }

  return (
    <div id="predictions-panel">
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        marginBottom: '20px',
        fontSize: '0.88rem',
        color: 'var(--text-secondary)'
      }}>
        {predictions.summary}
      </div>

      <div className="predictions-grid">
        {predictions.predictions.map((pred, i) => (
          <PredictionCard key={pred.column} prediction={pred} index={i} />
        ))}
      </div>
    </div>
  );
}

function PredictionCard({ prediction, index }) {
  const { column, trend, trendStrength, regression, volatility, historicalData, futurePredictions, explanation } = prediction;

  // Combine historical + predicted data for chart
  const chartData = [
    ...historicalData.map(d => ({
      step: d.step,
      Actual: d.actual,
      Trend: d.trend,
    })),
    ...futurePredictions.map(d => ({
      step: d.step,
      Predicted: d.predicted,
      Upper: d.upper,
      Lower: d.lower,
    }))
  ];

  const lastHistorical = historicalData[historicalData.length - 1]?.step;

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <div className="card prediction-card" id={`prediction-${index}`}>
      <div className="prediction-header">
        <span className="prediction-column">{column}</span>
        <span className={`trend-badge ${trend}`}>
          <TrendIcon size={14} />
          {trend} {trendStrength && `(${trendStrength})`}
        </span>
      </div>

      <div className="prediction-stats">
        <div className="prediction-stat">
          <div className="prediction-stat-label">R² Score</div>
          <div className="prediction-stat-value">{(regression.rSquared * 100).toFixed(1)}%</div>
        </div>
        <div className="prediction-stat">
          <div className="prediction-stat-label">Volatility</div>
          <div className="prediction-stat-value">{(volatility * 100).toFixed(1)}%</div>
        </div>
        <div className="prediction-stat">
          <div className="prediction-stat-label">Slope</div>
          <div className="prediction-stat-value" style={{
            color: regression.slope > 0 ? 'var(--success)' : regression.slope < 0 ? 'var(--danger)' : 'var(--info)',
            fontSize: '0.95rem'
          }}>
            {regression.slope > 0 ? '+' : ''}{regression.slope.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Prediction Chart */}
      <div className="prediction-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id={`predGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`futureGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="step" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />

            {lastHistorical && (
              <ReferenceLine
                x={lastHistorical}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="3 3"
                label={{ value: 'Now', position: 'top', fontSize: 10, fill: '#64748b' }}
              />
            )}

            <Area type="monotone" dataKey="Actual" stroke="#6366f1" fill={`url(#predGrad-${index})`} strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="Trend" stroke="#475569" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls={false} />
            <Area type="monotone" dataKey="Predicted" stroke="#f59e0b" fill={`url(#futureGrad-${index})`} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#f59e0b' }} connectNulls={false} />
            <Line type="monotone" dataKey="Upper" stroke="rgba(245,158,11,0.3)" strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="Lower" stroke="rgba(245,158,11,0.3)" strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <div className="prediction-explanation" style={{ marginTop: '16px' }}>
        {explanation}
      </div>
    </div>
  );
}
