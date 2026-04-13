import React, { useState } from 'react';
import { FileSpreadsheet, Clock, BarChart3, Lightbulb, LineChart, ScrollText, MessageCircle, AlertTriangle, GitCompare } from 'lucide-react';
import InsightsPanel from './InsightsPanel';
import ChartPanel from './ChartPanel';
import PredictionPanel from './PredictionPanel';
import ReportPanel from './ReportPanel';
import ChatPanel from './ChatPanel';
import AnomalyPanel from './AnomalyPanel';
import ExportMenu from './ExportMenu';

const TABS = [
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'predictions', label: 'Predictions', icon: LineChart },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'report', label: 'Report', icon: ScrollText },
];

export default function Dashboard({ results, filename }) {
  const [activeTab, setActiveTab] = useState('insights');

  const { cleaning, analysis, visualizations, predictions, anomalies, memory, report, duration, datasetId, orchestration } = results;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title" id="dashboard-title">Analysis <span>Complete</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="dashboard-meta">
            <div className="dashboard-meta-item"><FileSpreadsheet size={14} />{filename}</div>
            {duration && <div className="dashboard-meta-item"><Clock size={14} />{duration}</div>}
          </div>
          {datasetId && <ExportMenu datasetId={datasetId} />}
        </div>
      </div>

      {/* Memory / Comparison Banner */}
      {memory?.hasPrevious && memory.insights?.length > 0 && (
        <div className="memory-banner animate-in">
          <div className="memory-banner-title"><GitCompare size={16} /> Compared with: {memory.previousDataset?.filename}</div>
          <div className="memory-insights">
            {memory.insights.slice(0, 4).map((ins, i) => (
              <span key={i} className="memory-insight">{ins.icon} {ins.text}</span>
            ))}
          </div>
        </div>
      )}

      {/* Orchestrator info */}
      {orchestration?.reasoning && (
        <div className="orchestration-banner animate-in">
          <strong>🧩 Pipeline: </strong>
          {orchestration.reasoning.filter(r => r.startsWith('✅')).map(r => r.replace('✅ ', '').split(':')[0]).join(' → ')}
        </div>
      )}

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="card overview-card accent animate-in" id="card-rows">
          <div className="overview-label">Clean Records</div>
          <div className="overview-value accent">{cleaning?.cleanedRows?.toLocaleString() || '—'}</div>
          <div className="overview-detail">from {cleaning?.originalRows?.toLocaleString() || '—'} original</div>
        </div>
        <div className="card overview-card violet animate-in animate-in-delay-1" id="card-columns">
          <div className="overview-label">Columns</div>
          <div className="overview-value violet">{cleaning?.totalColumns || '—'}</div>
          <div className="overview-detail">{cleaning?.numericColumns || 0} numeric · {cleaning?.categoricalColumns || 0} categorical</div>
        </div>
        <div className="card overview-card success animate-in animate-in-delay-2" id="card-quality">
          <div className="overview-label">Data Quality</div>
          <div className="overview-value success">{cleaning?.dataQualityScore || '—'}%</div>
          <div className="overview-detail">{cleaning?.missingValuesFilled || 0} missing · {cleaning?.duplicatesRemoved || 0} dupes</div>
        </div>
        <div className="card overview-card warning animate-in animate-in-delay-3" id="card-insights">
          <div className="overview-label">Insights</div>
          <div className="overview-value warning">{analysis?.insights?.length || 0}</div>
          <div className="overview-detail">{analysis?.insights?.filter(i => i.severity === 'high').length || 0} high priority</div>
        </div>
        {anomalies && (
          <div className="card overview-card danger animate-in animate-in-delay-4" id="card-anomalies">
            <div className="overview-label">Anomalies</div>
            <div className="overview-value" style={{ color: 'var(--danger)' }}>{anomalies.summary?.totalAnomalies || 0}</div>
            <div className="overview-detail">{anomalies.summary?.critical || 0} critical</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist" id="dashboard-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            id={`tab-${tab.id}`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'insights' && analysis?.insights?.length > 0 && <span className="tab-badge">{analysis.insights.length}</span>}
            {tab.id === 'anomalies' && anomalies?.summary?.totalAnomalies > 0 && <span className="tab-badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{anomalies.summary.totalAnomalies}</span>}
            {tab.id === 'chat' && <span className="tab-badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>NEW</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in" role="tabpanel">
        {activeTab === 'insights' && <InsightsPanel insights={analysis?.insights || []} />}
        {activeTab === 'charts' && <ChartPanel charts={visualizations?.charts || []} />}
        {activeTab === 'predictions' && <PredictionPanel predictions={predictions} />}
        {activeTab === 'anomalies' && <AnomalyPanel anomalies={anomalies} />}
        {activeTab === 'chat' && <ChatPanel datasetId={datasetId} />}
        {activeTab === 'report' && <ReportPanel report={report} />}
      </div>
    </div>
  );
}
