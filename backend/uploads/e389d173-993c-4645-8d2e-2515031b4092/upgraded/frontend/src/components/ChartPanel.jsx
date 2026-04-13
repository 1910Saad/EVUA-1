import React from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(12, 12, 43, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '0.78rem',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
};

const AXIS_STYLE = {
  fontSize: '0.7rem',
  fill: '#64748b'
};

export default function ChartPanel({ charts }) {
  if (!charts || charts.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No visualizations generated for this dataset.</p>
      </div>
    );
  }

  return (
    <div className="charts-grid" id="charts-panel">
      {charts.map((chart, idx) => (
        <div key={chart.id || idx} className="card chart-card" id={`chart-${chart.id}`}>
          <div className="chart-card-header">
            <div className="chart-title">{chart.title}</div>
            <div className="chart-description">{chart.description}</div>
          </div>
          <div className="chart-container">
            {renderChart(chart)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderChart(chart) {
  switch (chart.type) {
    case 'bar':
    case 'histogram':
      return <RenderBarChart chart={chart} />;
    case 'line':
      return <RenderLineChart chart={chart} />;
    case 'scatter':
      return <RenderScatterChart chart={chart} />;
    case 'pie':
      return <RenderPieChart chart={chart} />;
    case 'boxplot':
      return <RenderBoxPlot chart={chart} />;
    default:
      return <RenderBarChart chart={chart} />;
  }
}

function RenderBarChart({ chart }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey={chart.xKey}
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
          interval={0}
          angle={chart.data.length > 6 ? -30 : 0}
          textAnchor={chart.data.length > 6 ? 'end' : 'middle'}
          height={chart.data.length > 6 ? 60 : 30}
        />
        <YAxis
          tick={AXIS_STYLE}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
        {(chart.yKeys || ['Count']).map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={chart.colors?.[i] || '#6366f1'}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderLineChart({ chart }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <defs>
          {(chart.yKeys || []).map((key, i) => (
            <linearGradient key={key} id={`gradient-${chart.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chart.colors?.[i] || '#6366f1'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chart.colors?.[i] || '#6366f1'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey={chart.xKey}
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
        {(chart.yKeys || []).map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={chart.colors?.[i] || '#6366f1'}
            fill={`url(#gradient-${chart.id}-${i})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: chart.colors?.[i] || '#6366f1', strokeWidth: 2, fill: '#06061a' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RenderScatterChart({ chart }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="x"
          name={chart.xLabel || 'X'}
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
          type="number"
        />
        <YAxis
          dataKey="y"
          name={chart.yLabel || 'Y'}
          tick={AXIS_STYLE}
          axisLine={false}
          tickLine={false}
          type="number"
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [
            typeof value === 'number' ? value.toFixed(2) : value,
            name === 'x' ? (chart.xLabel || 'X') : (chart.yLabel || 'Y')
          ]}
        />
        <Scatter
          data={chart.data}
          fill={chart.colors?.[0] || '#8b5cf6'}
          fillOpacity={0.7}
          r={4}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function RenderPieChart({ chart }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chart.data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={2}
          stroke="rgba(6,6,26,0.8)"
          strokeWidth={2}
          label={({ name, percentage }) => `${name} (${percentage}%)`}
          labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
          style={{ fontSize: '0.72rem', fill: '#94a3b8' }}
        >
          {chart.data.map((entry, i) => (
            <Cell key={i} fill={chart.colors?.[i % (chart.colors?.length || 1)] || '#6366f1'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [`${value} records`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RenderBoxPlot({ chart }) {
  // Render box plot data as a styled bar chart showing Q1, Median, Q3
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="name"
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
        <Bar dataKey="min" fill="#475569" radius={[2, 2, 0, 0]} maxBarSize={30} name="Min" />
        <Bar dataKey="q1" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={30} name="Q1" />
        <Bar dataKey="median" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={30} name="Median" />
        <Bar dataKey="q3" fill="#a78bfa" radius={[2, 2, 0, 0]} maxBarSize={30} name="Q3" />
        <Bar dataKey="max" fill="#c4b5fd" radius={[2, 2, 0, 0]} maxBarSize={30} name="Max" />
      </BarChart>
    </ResponsiveContainer>
  );
}
