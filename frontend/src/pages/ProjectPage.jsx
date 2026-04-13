import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, upgradeApi, downloadApi } from '../api/client';
import TechDetection from '../components/TechDetection';
import ProgressTracker from '../components/ProgressTracker';
import DiffViewer from '../components/DiffViewer';
import { Play, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const ProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [technologies, setTechnologies] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [diffs, setDiffs] = useState([]);
  const [pipelineState, setPipelineState] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, diffs
  
  // Polling interval
  useEffect(() => {
    fetchProjectData();
    let intervalId;

    if (project?.status === 'processing') {
      intervalId = setInterval(fetchProgress, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, project?.status]);

  const fetchProjectData = async () => {
    try {
      if (project?.status === 'completed' || project?.status === 'completed_with_warnings') {
        const results = await upgradeApi.getResults(id);
        if (results.success) {
          setProject(results.data.project);
          setTechnologies(results.data.technologies);
          setSuggestions(results.data.suggestions);
          setDiffs(results.data.diffs);
          setPipelineState(results.data.pipelineRun);
          setIsLoading(false);
          if (activeTab === 'overview' && results.data.diffs?.length > 0) {
            setActiveTab('diffs');
          }
          return;
        }
      }

      const res = await projectApi.getProject(id);
      if (res.success) {
        setProject(res.data);
        setTechnologies(res.data.technologies || []);
        setSuggestions(res.data.suggestions || []);
        setIsLoading(false);
        
        if (res.data.status === 'processing') {
          fetchProgress();
        }
      }
    } catch (error) {
      console.error('Failed to fetch project', error);
      setIsLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await upgradeApi.getProgress(id);
      if (res.success) {
        setPipelineState(res.data);
        
        if (res.data.status === 'success' || res.data.status === 'completed_with_warnings' || res.data.status === 'failed') {
          fetchProjectData(); // Get final results
        }
      }
    } catch (error) {
       // Silently fail progress poll
    }
  };

  const handleStartUpgrade = async () => {
    try {
      setIsStarting(true);
      await upgradeApi.startUpgrade(id);
      // Immediately fetch progress to trigger the polling state
      setProject(p => ({ ...p, status: 'processing' }));
    } catch (error) {
      alert("Failed to start upgrade: " + (error.response?.data?.message || error.message));
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) return <div className="animate-pulse glass h-96 rounded-xl flex items-center justify-center">Loading project data...</div>;
  if (!project) return <div className="text-center py-12">Project not found</div>;

  const isUpgraded = project.status === 'completed' || project.status === 'completed_with_warnings';
  const isProcessing = project.status === 'processing';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header section */}
      <div className="glass rounded-xl p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center text-muted-foreground space-x-4 text-sm mt-2">
            <span>{project.file_count} Files</span>
            <span>{(project.total_size / (1024 * 1024)).toFixed(2)} MB</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {new Date(project.created_at).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          {(project.status === 'uploaded' || project.status === 'pending') && (
            <button 
              onClick={handleStartUpgrade}
              disabled={isStarting}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-accent/20"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{isStarting ? 'Starting...' : 'Start Upgrade Pipeline'}</span>
            </button>
          )}

          {isUpgraded && (
            <>
              <button 
                onClick={() => downloadApi.downloadOriginal(id)}
                className="bg-secondary hover:bg-secondary-hover text-foreground px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2 border border-border"
              >
                <Download className="w-4 h-4" />
                <span>Original</span>
              </button>
              <button 
                onClick={() => downloadApi.downloadUpgraded(id)}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Upgraded</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isProcessing && (
        <ProgressTracker 
          pipelineState={pipelineState} 
          projectName={project.name} 
        />
      )}

      {/* Main Content Area */}
      {(!isProcessing || activeTab === 'diffs') && (
        <div className="space-y-6">
          {isUpgraded && (
            <div className="flex border-b border-border mb-6">
              <button 
                className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview & Detection
              </button>
              <button 
                className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 flex items-center ${activeTab === 'diffs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('diffs')}
              >
                Code Diffs
                <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                  {diffs.length}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}}>
                <TechDetection technologies={technologies} title="Detected Stack" />
              </motion.div>
              <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay: 0.1}}>
                <UpgradeSuggestions suggestions={suggestions} status={project.status} />
              </motion.div>
            </div>
          )}

          {activeTab === 'diffs' && isUpgraded && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}>
               <DiffViewer diffs={diffs} projectId={id} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

function StatusBadge({ status }) {
  const styles = {
    uploaded: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    processing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    completed_with_warnings: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const labels = {
    uploaded: "Ready for Upgrade",
    processing: "Pipeline Running",
    completed: "Upgrade Complete",
    completed_with_warnings: "Complete (With Warnings)",
    failed: "Pipeline Failed",
  };

  const IconStyles = {
    completed: <CheckCircle className="w-3 h-3 mr-1" />,
    completed_with_warnings: <AlertTriangle className="w-3 h-3 mr-1" />,
    failed: <AlertTriangle className="w-3 h-3 mr-1" />,
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center ${styles[status] || styles.uploaded}`}>
      {IconStyles[status]}
      {labels[status] || status}
    </span>
  );
}

function UpgradeSuggestions({ suggestions, status }) {
  // If not processing/completed, only high priority shown or empty state
  
  if (suggestions.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-white/5 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No suggestions yet</h3>
        <p className="text-sm text-muted-foreground">
          {status === 'uploaded' ? 'Start the upgrade pipeline to analyze code and generate suggestions.' : 'No issues found during analysis.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-white/5 h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold">Pipeline Findings</h2>
        <p className="text-sm text-muted-foreground mt-1">Issues addressed by transformations</p>
      </div>
      <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
        <div className="space-y-2 p-4">
          {suggestions.map((suggestion, idx) => (
             <div key={idx} className="bg-secondary/40 rounded-lg p-4 text-sm border border-border/50">
                <div className="flex items-start justify-between">
                  <div className="font-medium text-foreground mb-1">{suggestion.technology}</div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm
                    ${suggestion.priority === 'high' ? 'bg-destructive/20 text-destructive' : 
                      suggestion.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}
                  >
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-muted-foreground">{suggestion.description}</p>
                {suggestion.category === 'dependency' && (
                  <div className="mt-2 text-xs flex text-primary items-center">
                    Auto-fixable
                  </div>
                )}
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
