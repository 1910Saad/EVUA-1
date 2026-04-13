import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine } from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(12,12,43,0.95)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', fontSize: '0.78rem', color: '#e2e8f0'
};

export default function AnomalyPanel({ anomalies }) {
  if (!anomalies) {
    return <div className="card" style={{ textAlign: 'center', padding: '48px' }}><p style={{ color: 'var(--text-muted)' }}>No anomaly results available.</p></div>;
  }

  const { summary, columnSummaries, changePoints, topAnomalies, chartData } = anomalies;

  return (
    <div id="anomaly-panel">
      {/* Summary Cards */}
      <div className="overview-grid" style={{ marginBottom: '24px' }}>
        <div className="card overview-card danger">
          <div className="overview-label">Total Anomalies</div>
          <div className="overview-value" style={{ color: 'var(--danger)' }}>{summary.totalAnomalies}</div>
          <div className="overview-detail">{summary.critical} critical · {summary.high} high</div>
        </div>
        <div className="card overview-card warning">
          <div className="overview-label">Change Points</div>
          <div className="overview-value" style={{ color: 'var(--warning)' }}>{summary.changePoints}</div>
          <div className="overview-detail">Sudden shifts detected</div>
        </div>
        <div className="card overview-card success">
          <div className="overview-label">Health Score</div>
          <div className="overview-value" style={{ color: 'var(--success)' }}>{summary.healthScore}%</div>
          <div className="overview-detail">{summary.affectedColumns} columns affected</div>
        </div>
      </div>

      {/* Anomaly Charts */}
      {chartData && chartData.length > 0 && (
        <div className="charts-grid" style={{ marginBottom: '24px' }}>
          {chartData.map(cd => (
            <div key={cd.column} className="card chart-card">
              <div className="chart-card-header">
                <div className="chart-title">⚠️ Anomalies in {cd.column}</div>
                <div className="chart-description">Red = anomaly (z-score &gt; 2.5)</div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="index" tick={{ fontSize: '0.7rem', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="value" tick={{ fontSize: '0.7rem', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [typeof val === 'number' ? val.toFixed(2) : val, name]} />
                    <Scatter data={cd.data} r={3}>
                      {cd.data.map((d, i) => (
                        <Cell key={i} fill={d.isAnomaly ? '#ef4444' : 'rgba(99,102,241,0.4)'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Anomalies List */}
      {topAnomalies && topAnomalies.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Top Anomalies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topAnomalies.slice(0, 12).map((a, i) => (
              <div key={i} className="report-action">
                <span className={`severity-badge ${a.severity === 'critical' ? 'high' : a.severity}`} style={{ minWidth: '60px', textAlign: 'center' }}>
                  {a.severity}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {a.label} — <span style={{ color: 'var(--accent-light)' }}>{a.column}</span>: {typeof a.value === 'number' ? a.value.toLocaleString() : a.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Z-score: {a.zScore} · {a.deviation > 0 ? '+' : ''}{a.deviation}% from mean · {a.direction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Points */}
      {changePoints && changePoints.length > 0 && (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            {changePoints[0]?.direction === 'spike' ? <TrendingUp size={18} style={{ color: 'var(--warning)' }} /> : <TrendingDown size={18} style={{ color: 'var(--danger)' }} />}
            Change Points Detected
          </h3>
          {changePoints.slice(0, 8).map((cp, i) => (
            <div key={i} className="report-action" style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>{cp.direction === 'spike' ? '📈' : '📉'}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{cp.column} — Row {cp.row}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {cp.description} ({cp.percentChange > 0 ? '+' : ''}{cp.percentChange}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
