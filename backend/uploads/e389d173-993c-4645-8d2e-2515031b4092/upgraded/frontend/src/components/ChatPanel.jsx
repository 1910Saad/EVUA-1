import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BarChart3, Loader } from 'lucide-react';
import { sendChatMessage } from '../api/client';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(12,12,43,0.95)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', fontSize: '0.78rem', color: '#e2e8f0'
};

const SUGGESTIONS = [
  "What is the average salary?",
  "Show top 5 by performance_score",
  "Compare departments",
  "Why did satisfaction change?",
  "Any outliers in salary?",
  "Correlate salary with experience_years",
  "How many in each city?",
  "Show trend in salary"
];

export default function ChatPanel({ datasetId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(datasetId, question);
      const botMsg = { role: 'bot', content: res.answer.text, chart: res.answer.chart, type: res.answer.type };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: '❌ ' + (err.response?.data?.error || err.message), type: 'error' }]);
    }
    setLoading(false);
  };

  return (
    <div className="chat-container" id="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>💬</div>
            <h3>Chat with Your Data</h3>
            <p>Ask questions in plain English. I'll analyze the data and respond with insights.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.slice(0, 6).map((s, i) => (
                <button key={i} className="chat-suggestion" onClick={() => handleSend(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="chat-bubble">
              <div className="chat-text" dangerouslySetInnerHTML={{
                __html: msg.content
                  ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br/>')
              }} />
              {msg.chart && (
                <div className="chat-chart">
                  <MiniChart config={msg.chart} />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message bot">
            <div className="chat-avatar"><Bot size={16} /></div>
            <div className="chat-bubble"><Loader size={16} className="spinning" /> Analyzing...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your data..."
          disabled={loading}
          id="chat-input"
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="chat-send-btn" id="chat-send">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function MiniChart({ config }) {
  if (!config?.data?.length) return null;
  const AXIS = { fontSize: '0.65rem', fill: '#64748b' };

  if (config.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={config.data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={config.xKey} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {(config.yKeys || ['value']).map((k, i) => (
            <Bar key={k} dataKey={k} fill={config.colors?.[i] || '#6366f1'} radius={[4,4,0,0]} maxBarSize={35} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={config.data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={config.xKey} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {(config.yKeys || []).map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stroke={config.colors?.[i] || '#6366f1'} fill="transparent" strokeWidth={2} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="x" type="number" tick={AXIS} axisLine={false} tickLine={false} name={config.xLabel} />
          <YAxis dataKey="y" type="number" tick={AXIS} axisLine={false} tickLine={false} name={config.yLabel} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Scatter data={config.data} fill={config.colors?.[0] || '#8b5cf6'} fillOpacity={0.7} r={3} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={config.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} stroke="rgba(6,6,26,0.8)">
            {config.data.map((_, i) => <Cell key={i} fill={config.colors?.[i % config.colors.length] || '#6366f1'} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
