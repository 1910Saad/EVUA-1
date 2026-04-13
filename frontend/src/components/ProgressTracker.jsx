import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

const ProgressTracker = ({ pipelineState, projectName }) => {
  if (!pipelineState) return null;

  const currentStage = pipelineState.currentStage;
  const progress = pipelineState.progress || 0;
  
  const stages = [
    { id: 'analysis', name: 'Project Analysis', desc: 'Detecting frameworks & anti-patterns' },
    { id: 'dependencies', name: 'Dependency Management', desc: 'Updating package versions safely' },
    { id: 'rule-transform', name: 'Rule-Based Transforms', desc: 'Applying heuristic refactoring' },
    { id: 'ai-transform', name: 'AI-Based Transforms', desc: 'LLM complex path refactoring' },
    { id: 'validation', name: 'Validation & Tests', desc: 'Checking integrity & syntax' },
    { id: 'diff-generation', name: 'Diff Generation', desc: 'Creating comparison views' },
  ];

  let activeIndex = stages.findIndex(s => s.id === currentStage);
  if (pipelineState.status === 'completed' || pipelineState.status === 'completed_with_warnings') {
    activeIndex = stages.length; 
  }

  return (
    <div className="glass rounded-xl p-8 border border-white/5 animate-fade-in relative overflow-hidden">
      {/* Background gradient effect matching progress */}
      <div 
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
        style={{ width: `${progress}%` }}
      />
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Transforming {projectName}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {pipelineState.status === 'failed' ? <span className="text-destructive font-medium">Pipeline Failed: {pipelineState.error}</span> :
             activeIndex >= stages.length ? "Upgrade completed successfully." : 
             `Running pipeline... (${progress}%)`}
          </p>
        </div>
        
        {progress < 100 && pipelineState.status !== 'failed' && (
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center text-sm font-medium">
             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
             AI Agents Working
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage, index) => {
          const isCompleted = index < activeIndex || progress === 100;
          const isActive = index === activeIndex && pipelineState.status !== 'failed';
          const isPending = index > activeIndex && pipelineState.status !== 'failed';
          const isFailed = pipelineState.status === 'failed' && index === activeIndex;

          return (
            <div 
              key={stage.id}
              className={`p-5 rounded-xl border transition-all duration-500 flex flex-col
                ${isActive ? 'bg-secondary border-primary/50 shadow-lg shadow-primary/10' : 
                  isCompleted ? 'bg-secondary/50 border-white/5' : 
                  isFailed ? 'bg-destructive/10 border-destructive/50' :
                  'bg-transparent border-white/5 opacity-50'}`}
            >
               <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full 
                    ${isCompleted ? 'bg-accent/20 text-accent' : 
                      isActive ? 'bg-primary/20 text-primary' : 
                      isFailed ? 'bg-destructive/20 text-destructive' :
                      'bg-secondary text-muted-foreground'}`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                       isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                       <Circle className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">0{index + 1}</span>
               </div>
               
               <h3 className={`font-semibold text-base ${isActive ? 'text-primary-foreground' : ''}`}>{stage.name}</h3>
               <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stage.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default ProgressTracker;
