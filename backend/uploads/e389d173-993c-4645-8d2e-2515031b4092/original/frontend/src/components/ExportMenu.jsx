import React, { useState, useRef } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, ChevronDown } from 'lucide-react';

export default function ExportMenu({ datasetId }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const handleExport = (format) => {
    const url = `/api/export/${datasetId}/${format}`;
    window.open(url, '_blank');
    setOpen(false);
  };

  return (
    <div className="export-menu-wrapper" ref={menuRef}>
      <button className="navbar-action-btn" onClick={() => setOpen(!open)} id="export-btn">
        <Download size={14} />
        Export
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {open && (
        <>
          <div className="export-backdrop" onClick={() => setOpen(false)} />
          <div className="export-dropdown">
            <button className="export-option" onClick={() => handleExport('csv')} id="export-csv">
              <FileSpreadsheet size={16} style={{ color: 'var(--success)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>Cleaned CSV</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Download cleaned dataset</div>
              </div>
            </button>
            <button className="export-option" onClick={() => handleExport('json')} id="export-json">
              <FileJson size={16} style={{ color: 'var(--accent-light)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>Analysis JSON</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Full analysis results</div>
              </div>
            </button>
            <button className="export-option" onClick={() => handleExport('report')} id="export-report">
              <FileText size={16} style={{ color: 'var(--warning)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>Report (TXT)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Formatted text report</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
