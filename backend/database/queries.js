import { 
  User, Project, Technology, Suggestion, History, PipelineRun, DiffResult 
} from './models.js';

// ============ USERS ============

export async function createUser(username, hashedPassword) {
  const user = new User({ username, password: hashedPassword });
  const saved = await user.save();
  return saved._id;
}

export async function getUserByUsername(username) {
  return User.findOne({ username }).lean();
}

export async function getUserById(id) {
  return User.findById(id).lean();
}

// ============ PROJECTS ============

export async function createProject({ id, name, originalPath, fileCount, totalSize, userId }) {
  const project = new Project({
    id, name, original_path: originalPath, file_count: fileCount || 0, total_size: totalSize || 0, user_id: userId || null
  });
  return project.save();
}

export async function getProject(id) {
  const proj = await Project.findOne({ id }).lean();
  if (proj && proj.user_id) proj.user_id = proj.user_id.toString();
  return proj;
}

export async function getAllProjects(userId) {
  const query = userId ? { user_id: userId } : {};
  return Project.find(query).sort({ created_at: -1 }).lean();
}

export async function updateProject(id, fields) {
  const allowed = ['name', 'upgraded_path', 'status', 'file_count', 'total_size'];
  const updateDoc = {};
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updateDoc[key] = value;
    }
  }
  updateDoc.updated_at = new Date();
  return Project.updateOne({ id }, { $set: updateDoc });
}

export async function deleteProject(id) {
  return Project.deleteOne({ id });
}

// ============ TECHNOLOGIES ============

export async function addTechnology({ projectId, name, category, currentVersion, latestVersion, filePath, confidence }) {
  const tech = new Technology({
    project_id: projectId, name, category, current_version: currentVersion, latest_version: latestVersion, file_path: filePath, confidence: confidence || 1.0
  });
  return tech.save();
}

export async function getTechnologies(projectId) {
  return Technology.find({ project_id: projectId }).sort({ category: 1, name: 1 }).lean();
}

export async function clearTechnologies(projectId) {
  return Technology.deleteMany({ project_id: projectId });
}

// ============ UPGRADE SUGGESTIONS ============

export async function addSuggestion({ projectId, technology, description, priority, category, autoFixable, filePath, lineStart, lineEnd, originalCode, suggestedCode }) {
  const sug = new Suggestion({
    project_id: projectId, technology, description, priority: priority || 'medium', category, auto_fixable: !!autoFixable, file_path: filePath, line_start: lineStart, line_end: lineEnd, original_code: originalCode, suggested_code: suggestedCode
  });
  return sug.save();
}

export async function getSuggestions(projectId) {
  return Suggestion.find({ project_id: projectId }).sort({ priority: -1, category: 1 }).lean();
}

export async function updateSuggestionStatus(id, status) {
  return Suggestion.updateOne({ _id: id }, { $set: { status } });
}

export async function clearSuggestions(projectId) {
  return Suggestion.deleteMany({ project_id: projectId });
}

// ============ UPGRADE HISTORY ============

export async function addHistoryEntry({ projectId, agent, action, filePath, description, status, details }) {
  const hist = new History({
    project_id: projectId, agent, action, file_path: filePath, description, status: status || 'success', details
  });
  return hist.save();
}

export async function getHistory(projectId) {
  return History.find({ project_id: projectId }).sort({ created_at: -1 }).lean();
}

// ============ PIPELINE RUNS ============

export async function createPipelineRun(projectId) {
  const run = new PipelineRun({ project_id: projectId });
  const saved = await run.save();
  return saved._id.toString(); // Return inserted string ID to orchestrator
}

export async function updatePipelineRun(id, fields) {
  const allowed = ['status', 'current_stage', 'progress', 'completed_at', 'error'];
  const updateDoc = {};
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updateDoc[key] = value;
    }
  }
  return PipelineRun.updateOne({ _id: id }, { $set: updateDoc });
}

export async function getLatestPipelineRun(projectId) {
  return PipelineRun.findOne({ project_id: projectId }).sort({ created_at: -1 }).lean();
}

// ============ DIFF RESULTS ============

export async function addDiffResult({ projectId, filePath, originalContent, upgradedContent, diffContent, changeType }) {
  const diff = new DiffResult({
    project_id: projectId, file_path: filePath, original_content: originalContent, upgraded_content: upgradedContent, diff_content: diffContent, change_type: changeType || 'modified'
  });
  return diff.save();
}

export async function getDiffResults(projectId) {
  return DiffResult.find({ project_id: projectId }).sort({ file_path: 1 }).lean();
}

export async function clearDiffResults(projectId) {
  return DiffResult.deleteMany({ project_id: projectId });
}

export default {
  createUser, getUserByUsername, getUserById,
  createProject, getProject, getAllProjects, updateProject, deleteProject,
  addTechnology, getTechnologies, clearTechnologies,
  addSuggestion, getSuggestions, updateSuggestionStatus, clearSuggestions,
  addHistoryEntry, getHistory,
  createPipelineRun, updatePipelineRun, getLatestPipelineRun,
  addDiffResult, getDiffResults, clearDiffResults,
};
