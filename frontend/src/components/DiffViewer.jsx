import { useState } from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';
import { FileCode, FilePlus, FileMinus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DiffViewer = ({ diffs, projectId }) => {
  const [selectedDiff, setSelectedDiff] = useState(diffs[0] || null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!diffs || diffs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-white/5 h-64 flex flex-col items-center justify-center text-center">
        <FileCode className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Changes Detected</h3>
        <p className="text-muted-foreground">The codebase was already up-to-date or no safe transformations were found.</p>
      </div>
    );
  }

  const filteredDiffs = diffs.filter(d => d.filePath.toLowerCase().includes(searchTerm.toLowerCase()));

  const getLanguage = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', json: 'json', html: 'html', css: 'css', md: 'markdown'
    };
    return map[ext] || 'plaintext';
  };

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden flex flex-col md:flex-row h-[700px]">
      
      {/* File List Sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-secondary/20 flex flex-col">
        <div className="p-4 border-b border-border bg-secondary/40">
           <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input 
               type="text" 
               placeholder="Search files..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-0.5 p-2">
            <AnimatePresence>
              {filteredDiffs.map((diff) => (
                <motion.li 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  key={diff.id || diff.filePath}
                >
                  <button
                    onClick={() => setSelectedDiff(diff)}
                    className={`w-full text-left px-3 py-2.5 rounded-md flex items-start space-x-3 transition-colors ${
                      selectedDiff?.filePath === diff.filePath 
                        ? 'bg-primary/20 text-primary-foreground' 
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {diff.changeType === 'added' ? <FilePlus className="w-4 h-4 text-accent" /> :
                       diff.changeType === 'deleted' ? <FileMinus className="w-4 h-4 text-destructive" /> :
                       <FileCode className={`w-4 h-4 ${selectedDiff?.filePath === diff.filePath ? 'text-primary' : ''}`} />}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-sm font-medium truncate">{diff.filePath.split('/').pop()}</div>
                      <div className="text-[10px] truncate opacity-70">{diff.filePath}</div>
                    </div>
                    {diff.changeType === 'modified' && (
                      <div className="shrink-0 flex items-center space-x-1 text-xs">
                        {diff.additions > 0 && <span className="text-accent">+{diff.additions}</span>}
                        {diff.deletions > 0 && <span className="text-destructive">-{diff.deletions}</span>}
                      </div>
                    )}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            {filteredDiffs.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No files match search.</div>
            )}
          </ul>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        {selectedDiff ? (
          <>
            <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-[#252526] shrink-0">
              <div className="flex items-center space-x-2 text-sm font-medium text-[#cccccc]">
                <span>{selectedDiff.filePath}</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white/70">
                  {selectedDiff.changeType}
                </span>
              </div>
            </div>
            <div className="flex-1 w-full relative">
              {selectedDiff.changeType === 'modified' ? (
                <DiffEditor
                  height="100%"
                  language={getLanguage(selectedDiff.filePath)}
                  theme="vs-dark"
                  original={selectedDiff.originalContent || ''}
                  modified={selectedDiff.upgradedContent || ''}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    renderSideBySide: true,
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                  }}
                />
              ) : (
                <Editor
                  height="100%"
                  language={getLanguage(selectedDiff.filePath)}
                  theme="vs-dark"
                  value={selectedDiff.upgradedContent || selectedDiff.originalContent || ''}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a file to view changes
          </div>
        )}
      </div>

    </div>
  );
};

export default DiffViewer;
