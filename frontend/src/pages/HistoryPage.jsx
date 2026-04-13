import { useState, useEffect } from 'react';
import { projectApi } from '../api/client';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const HistoryPage = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAllProjects();
        if (response.success) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch projects', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upgrade History</h1>
        <p className="text-muted-foreground mt-2">View and manage previously upgraded projects.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse bg-secondary/20 border-white/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="bg-secondary/50 p-4 rounded-full text-muted-foreground mb-2">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Upload a legacy project to get started with your first AI-assisted upgrade.
          </p>
          <Link to="/" className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors mt-4">
            Upload Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={project.id}
            >
              <Link 
                to={`/project/${project.id}`}
                className="glass hover:bg-card/60 transition-all duration-300 rounded-xl p-6 flex flex-col h-full border border-white/10 hover:border-primary/50 group block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary/20 p-2.5 rounded-lg text-primary">
                    <Box className="w-5 h-5" />
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                
                <h3 className="font-semibold text-lg truncate mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                
                <div className="mt-auto pt-6 flex flex-col space-y-2">
                  <div className="flex items-center text-xs text-muted-foreground space-x-4">
                    <div className="flex items-center">
                      <span className="font-medium mr-1">{project.file_count || 0}</span> files
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm font-medium text-primary pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
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
    uploaded: "Ready",
    processing: "Processing",
    completed: "Completed",
    completed_with_warnings: "With Warnings",
    failed: "Failed",
  };

  const style = styles[status] || styles.uploaded;
  const label = labels[status] || status;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}

export default HistoryPage;
