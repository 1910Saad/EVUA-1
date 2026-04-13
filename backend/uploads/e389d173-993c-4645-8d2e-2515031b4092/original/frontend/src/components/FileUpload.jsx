import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, ArrowRight, Plus, X } from 'lucide-react';

export default function FileUpload({ onUpload, user, onLoginRequired }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setSelectedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = acceptedFiles.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 50 * 1024 * 1024
  });

  const removeFile = (name) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== name));
  };

  const handleSubmit = () => {
    if (!user) {
      onLoginRequired();
      return;
    }
    
    if (selectedFiles.length > 0) {
      // For now, process the first file (multi-file batch supported on backend)
      onUpload(selectedFiles[0]);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-page">
      <div className="upload-hero animate-in">
        <h1>Transform Raw Data<br />Into Insights</h1>
        <p>
          Upload CSV files and let our AI pipeline clean, analyze, detect anomalies,
          predict trends, and generate comprehensive reports — all in seconds.
        </p>
      </div>

      <div {...getRootProps()} className={`dropzone animate-in animate-in-delay-1 ${isDragActive ? 'active' : ''}`} id="dropzone">
        <input {...getInputProps()} id="file-input" />
        <div className="dropzone-content">
          <div className="dropzone-icon"><Upload size={28} /></div>
          <h3>{isDragActive ? 'Drop your CSV files here' : 'Drag & drop CSV files'}</h3>
          <p>or <span className="accent-text">browse your files</span> · Max 50MB each</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="animate-in" style={{ width: '100%', maxWidth: '600px' }}>
          {selectedFiles.map((file, i) => (
            <div key={file.name} className="file-selected" style={{ marginTop: i === 0 ? '20px' : '8px' }}>
              <FileSpreadsheet size={22} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
              <div className="file-selected-info">
                <div className="file-selected-name">{file.name}</div>
                <div className="file-selected-size">{formatSize(file.size)}</div>
              </div>
              <button onClick={() => removeFile(file.name)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="upload-btn animate-in animate-in-delay-2" onClick={handleSubmit} disabled={selectedFiles.length === 0} id="upload-btn">
        {user ? 'Start Analysis Pipeline' : 'Login to Upload'} <ArrowRight size={18} />
      </button>

      <div className="upload-features animate-in animate-in-delay-3">
        <div className="upload-feature">
          <div className="upload-feature-icon">🧹</div>
          <div className="upload-feature-text"><strong>Smart Cleaning</strong>Missing values, duplicates & normalization</div>
        </div>
        <div className="upload-feature">
          <div className="upload-feature-icon">💬</div>
          <div className="upload-feature-text"><strong>Chat with Data</strong>Ask questions in plain English</div>
        </div>
        <div className="upload-feature">
          <div className="upload-feature-icon">⚠️</div>
          <div className="upload-feature-text"><strong>Anomaly Detection</strong>Detect spikes, drops & outliers</div>
        </div>
        <div className="upload-feature">
          <div className="upload-feature-icon">🧠</div>
          <div className="upload-feature-text"><strong>Memory & Compare</strong>Track changes across uploads</div>
        </div>
        <div className="upload-feature">
          <div className="upload-feature-icon">📥</div>
          <div className="upload-feature-text"><strong>Export Anything</strong>CSV, JSON, or formatted report</div>
        </div>
        <div className="upload-feature">
          <div className="upload-feature-icon">🔮</div>
          <div className="upload-feature-text"><strong>Predictions</strong>Trend analysis & forecasting</div>
        </div>
      </div>
    </div>
  );
}
