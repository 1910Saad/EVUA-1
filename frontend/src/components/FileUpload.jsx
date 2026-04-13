import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileArchive, X, Loader2 } from 'lucide-react';
import { projectApi } from '../api/client';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed' && !file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return false;
    }
    setError('');
    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');
      const response = await projectApi.uploadProject(file);
      if (response.success) {
        navigate(`/project/${response.data.projectId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to upload project');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={cn(
          "glass rounded-xl p-10 border-2 border-dashed transition-all duration-300 relative overflow-hidden",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleChange}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
          )}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">Upload your codebase</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Drag and drop your project ZIP file here, or click to browse. We'll analyze it for outdated dependencies and code patterns.
            </p>
          </div>
          
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center space-x-2"
          >
            <span>Select ZIP File</span>
          </label>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center"
          >
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {file && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-6 glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary/20 p-3 rounded-lg text-primary">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setFile(null)}
                disabled={isUploading}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Start Analysis</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
