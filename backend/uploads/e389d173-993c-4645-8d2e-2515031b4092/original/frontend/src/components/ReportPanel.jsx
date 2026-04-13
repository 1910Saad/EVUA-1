import React from 'react';

export default function ReportPanel({ report }) {
  if (!report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No report available.</p>
      </div>
    );
  }

  return (
    <div className="report-container" id="report-panel">
      {/* Report Header */}
      <div className="card report-header">
        <h2 className="report-title">{report.title}</h2>
        <div className="report-subtitle">{report.subtitle}</div>
        <div className="report-date">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </div>
      </div>

      {/* Report Sections */}
      {report.sections?.map((section) => (
        <div key={section.id} className="card report-section" id={`report-${section.id}`}>
          <h3 className="report-section-title">
            <span className="report-section-icon">{section.icon}</span>
            {section.title}
          </h3>

          {renderSection(section)}
        </div>
      ))}
    </div>
  );
}

function renderSection(section) {
  switch (section.type) {
    case 'summary':
      return <p className="report-text">{section.content}</p>;

    case 'overview':
      return <OverviewSection content={section.content} />;

    case 'quality':
      return <QualitySection content={section.content} />;

    case 'insights':
      return <InsightsSection content={section.content} />;

    case 'statistics':
      return <StatisticsSection content={section.content} />;

    case 'predictions':
      return <PredictionsSection content={section.content} />;

    case 'recommendations':
      return <RecommendationsSection content={section.content} />;

    default:
      return <p className="report-text">{JSON.stringify(section.content)}</p>;
  }
}

function OverviewSection({ content }) {
  return (
    <div>
      <p className="report-text">{content.description}</p>
      <div className="report-metrics">
        {content.metrics?.map((metric, i) => (
          <div key={i} className="report-metric">
            <div className="report-metric-icon">{metric.icon}</div>
            <div className="report-metric-value">{metric.value}</div>
            <div className="report-metric-label">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualitySection({ content }) {
  const scoreClass =
    content.qualityScore >= 90 ? 'excellent' :
    content.qualityScore >= 70 ? 'good' :
    content.qualityScore >= 50 ? 'moderate' : 'poor';

  const scoreLabel =
    content.qualityScore >= 90 ? 'Excellent' :
    content.qualityScore >= 70 ? 'Good' :
    content.qualityScore >= 50 ? 'Moderate' : 'Needs Improvement';

  return (
    <div>
      <div className="quality-score">
        <div className={`quality-ring ${scoreClass}`}>
          {content.qualityScore}
        </div>
        <div className="quality-label">
          <strong>{scoreLabel} Data Quality</strong>
          {content.description}
        </div>
      </div>

      {content.actions?.map((action, i) => (
        <div key={i} className="report-action">
          <div className="report-action-icon">
            {action.status === 'good' ? '✅' : '⚠️'}
          </div>
          <div>
            <div className="report-action-title">
              {action.action}: {action.count}
            </div>
            <div className="report-action-detail">{action.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightsSection({ content }) {
  return (
    <div>
      <p className="report-text" style={{ marginBottom: '16px' }}>{content.description}</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {content.highPriority > 0 && (
          <span className="severity-badge high" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
            {content.highPriority} High Priority
          </span>
        )}
        {content.mediumPriority > 0 && (
          <span className="severity-badge medium" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
            {content.mediumPriority} Medium Priority
          </span>
        )}
      </div>
      {content.insights?.slice(0, 6).map((insight, i) => (
        <div key={i} className="report-action" style={{ marginBottom: '6px' }}>
          <div className="report-action-icon">{insight.icon}</div>
          <div>
            <div className="report-action-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {insight.title}
              <span className={`severity-badge ${insight.severity}`}>{insight.severity}</span>
            </div>
            <div className="report-action-detail">{insight.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatisticsSection({ content }) {
  const columns = content.columns || [];

  return (
    <div>
      <p className="report-text" style={{ marginBottom: '16px' }}>{content.description}</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Column', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Skewness'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((col, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>{col.name}</td>
                <td style={{ padding: '10px 12px' }}>{col.mean?.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>{col.median?.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>{col.std?.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>{col.min?.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>{col.max?.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>{col.skewness?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PredictionsSection({ content }) {
  return (
    <div>
      <p className="report-text" style={{ marginBottom: '16px' }}>{content.description}</p>
      {content.variables?.map((v, i) => (
        <div key={i} className="report-action" style={{ marginBottom: '8px' }}>
          <div className="report-action-icon">
            {v.trend === 'increasing' ? '📈' : v.trend === 'decreasing' ? '📉' : '➡️'}
          </div>
          <div>
            <div className="report-action-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {v.column}
              <span className={`trend-badge ${v.trend}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                {v.trend}
              </span>
            </div>
            <div className="report-action-detail">{v.explanation}</div>
            <div style={{
              marginTop: '6px',
              display: 'flex',
              gap: '12px',
              fontSize: '0.72rem',
              color: 'var(--text-dim)'
            }}>
              <span>R²: <strong style={{ color: 'var(--accent-light)' }}>{(v.rSquared * 100).toFixed(1)}%</strong></span>
              <span>Volatility: <strong style={{ color: 'var(--warning)' }}>{(v.volatility * 100).toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationsSection({ content }) {
  return (
    <div>
      <p className="report-text" style={{ marginBottom: '16px' }}>{content.description}</p>
      {content.recommendations?.map((rec, i) => (
        <div key={i} className="report-action" style={{ marginBottom: '8px' }}>
          <div className="report-action-icon">{rec.icon || '💡'}</div>
          <div>
            <div className="report-action-title">{rec.title}</div>
            <div className="report-action-detail">{rec.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
