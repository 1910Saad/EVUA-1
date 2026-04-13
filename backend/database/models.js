import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

export const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  original_path: String,
  upgraded_path: String,
  status: { type: String, default: 'uploaded' },
  file_count: Number,
  total_size: Number,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export const technologySchema = new mongoose.Schema({
  project_id: String,
  name: String,
  category: String,
  current_version: String,
  latest_version: String,
  file_path: String,
  confidence: Number
});

export const suggestionSchema = new mongoose.Schema({
  project_id: String,
  technology: String,
  description: String,
  priority: String,
  category: String,
  auto_fixable: Boolean,
  file_path: String,
  line_start: Number,
  line_end: Number,
  original_code: String,
  suggested_code: String,
  status: { type: String, default: 'pending' }
});

export const historySchema = new mongoose.Schema({
  project_id: String,
  agent: String,
  action: String,
  file_path: String,
  description: String,
  status: String,
  details: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now }
});

export const pipelineRunSchema = new mongoose.Schema({
  project_id: String,
  status: { type: String, default: 'running' },
  current_stage: { type: String, default: 'discovery' },
  progress: { type: Number, default: 0 },
  error: String,
  started_at: { type: Date, default: Date.now },
  completed_at: Date
});

export const diffResultSchema = new mongoose.Schema({
  project_id: String,
  file_path: String,
  original_content: String,
  upgraded_content: String,
  diff_content: String,
  change_type: String
});

export const User = mongoose.model('User', userSchema);
export const Project = mongoose.model('Project', projectSchema);
export const Technology = mongoose.model('Technology', technologySchema);
export const Suggestion = mongoose.model('UpgradeSuggestion', suggestionSchema);
export const History = mongoose.model('UpgradeHistory', historySchema);
export const PipelineRun = mongoose.model('PipelineRun', pipelineRunSchema);
export const DiffResult = mongoose.model('DiffResult', diffResultSchema);
