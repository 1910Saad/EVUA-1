import React, { useState, useEffect } from 'react';
import { Clock, FileSpreadsheet, BarChart3, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { getHistory, deleteHistory, getHistoryDetail } from '../api/client';

export default function HistoryPage({ onLoadDataset }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory();
      setDatasets(res.datasets || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteHistory(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleLoad = async (id) => {
    try {
      const data = await getHistoryDetail(id);
      onLoadDataset(data);
    } catch (err) { console.error('Load failed:', err); }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spinning" style={{ marginBottom: '12px' }} />
        <p>Loading history...</p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
        <h3 style={{ marginBottom: '8px' }}>No Past Analyses</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload a CSV to get started. Your analyses will appear here.</p>
      </div>
    );
  }

  return (
    <div id="history-page">
      <div className="dashboard-header" style={{ marginBottom: '24px' }}>
        <h1 className="dashboard-title">📋 Analysis <span>History</span></h1>
        <button className="navbar-action-btn" onClick={loadHistory}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="history-grid">
        {datasets.map((ds, i) => (
          <div key={ds.id} className="card history-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="card-icon accent"><FileSpreadsheet size={18} /></div>
                <div>
                  <div style={{ fontWeight: 600 }}>{ds.filename}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(ds.uploadedAt).toLocaleDateString()}</span>
                    <span>{ds.cleanedRowCount || '—'} rows</span>
                    <span className={`severity-badge ${ds.status === 'completed' ? 'low' : 'medium'}`}>{ds.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {ds.cleaningSummary && (
              <div style={{ display: 'flex', gap: '16px', margin: '12px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span>📊 {ds.cleaningSummary.totalColumns || '—'} cols</span>
                <span>🔢 {ds.cleaningSummary.numericColumns || 0} numeric</span>
                <span>🏷️ {ds.cleaningSummary.categoricalColumns || 0} categorical</span>
                <span>✅ Quality: {ds.cleaningSummary.dataQualityScore || '—'}%</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="navbar-action-btn" onClick={() => handleDelete(ds.id)} style={{ color: 'var(--danger)' }}>
                <Trash2 size={13} /> Delete
              </button>
              <button className="upload-btn" style={{ padding: '8px 16px', fontSize: '0.8rem', marginTop: 0 }} onClick={() => handleLoad(ds.id)}>
                View Results <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
