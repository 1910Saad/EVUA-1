import React from 'react';

export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No insights generated for this dataset.</p>
      </div>
    );
  }

  const getInsightIcon = (type) => {
    const icons = {
      correlation: '🔗',
      outlier: '⚠️',
      distribution: '📊',
      variability: '📈',
      categorical: '🏷️'
    };
    return icons[type] || '💡';
  };

  return (
    <div className="insights-grid" id="insights-panel">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="card insight-card"
          style={{ animationDelay: `${i * 0.05}s` }}
          id={`insight-${i}`}
        >
          <div className="insight-header">
            <span className="insight-icon">{insight.icon || getInsightIcon(insight.type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="insight-title">{insight.title}</span>
                <span className={`severity-badge ${insight.severity}`}>
                  {insight.severity}
                </span>
              </div>
            </div>
          </div>
          <p className="insight-description">{insight.description}</p>

          {/* Category breakdown for categorical insights */}
          {insight.topCategories && insight.topCategories.length > 0 && (
            <div style={{
              marginTop: '12px',
              marginLeft: '36px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              {insight.topCategories.map((cat, j) => (
                <span
                  key={j}
                  style={{
                    padding: '3px 10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {cat.name}
                  <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                    {cat.percentage}%
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
