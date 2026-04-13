import path from 'path';
import { analyzeProject } from '../agents/analyzer.js';
import { applyRuleTransformations } from '../agents/ruleTransformer.js';
import { applyAiTransformations } from '../agents/aiTransformer.js';
import { manageDependencies } from '../agents/dependencyManager.js';
import { validateProject } from '../agents/validator.js';
import { generateDiffs } from '../agents/diffGenerator.js';
import { copyDirectory } from '../utils/fileUtils.js';
import * as db from '../database/queries.js';
import logger from '../middleware/logger.js';

/**
 * Agent 2: Pipeline Orchestrator
 * Manages the complete upgrade pipeline from analysis to diff generation.
 * Coordinates all agents in sequence and tracks progress.
 */

// Pipeline stages in order
const STAGES = [
  { id: 'analysis', name: 'Project Analysis', agent: 'Agent 5: Analyzer', weight: 15 },
  { id: 'dependencies', name: 'Dependency Management', agent: 'Agent 8: Dependency Manager', weight: 15 },
  { id: 'rule-transform', name: 'Rule-Based Transformations', agent: 'Agent 6: Rule Transformer', weight: 20 },
  { id: 'ai-transform', name: 'AI-Based Transformations', agent: 'Agent 7: AI Transformer', weight: 20 },
  { id: 'validation', name: 'Validation & Testing', agent: 'Agent 9: Validator', weight: 15 },
  { id: 'diff-generation', name: 'Diff Generation', agent: 'Agent 10: Diff Generator', weight: 15 },
];

// In-memory progress tracking for active pipelines
const activePipelines = new Map();

/**
 * Run the complete upgrade pipeline for a project.
 * @param {string} projectId - The project ID.
 * @param {string} originalDir - Path to the original project files.
 * @returns {object} Complete pipeline results.
 */
export async function runPipeline(projectId, originalDir) {
  logger.info('Pipeline: Starting upgrade pipeline', { projectId, originalDir });

  // Create pipeline run in database
  const pipelineRun = db.createPipelineRun(projectId);
  const pipelineId = pipelineRun.lastInsertRowid;

  // Initialize progress tracking
  const progress = {
    pipelineId,
    projectId,
    status: 'running',
    currentStage: null,
    progress: 0,
    stages: {},
    startedAt: new Date().toISOString(),
  };
  activePipelines.set(projectId, progress);

  // Create a copy of the project for upgrades (never modify the original)
  const upgradedDir = originalDir.replace(/\/original$/, '/upgraded').replace(/\\original$/, '\\upgraded');
  logger.info('Pipeline: Copying project for upgrade', { from: originalDir, to: upgradedDir });
  copyDirectory(originalDir, upgradedDir);

  db.updateProject(projectId, {
    upgraded_path: upgradedDir,
    status: 'processing',
  });

  const results = {
    projectId,
    pipelineId,
    stages: {},
    overallStatus: 'success',
  };

  try {
    // ═══════════════════════════════════════════
    // Stage 1: Project Analysis (Agent 5)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'analysis', 0);

    const analysisResults = await analyzeProject(originalDir);
    results.stages.analysis = analysisResults;

    // Store detected technologies in database
    db.clearTechnologies(projectId);
    for (const framework of analysisResults.frameworks) {
      db.addTechnology({
        projectId,
        name: framework.name,
        category: framework.category,
        currentVersion: framework.version,
        filePath: framework.foundIn,
        confidence: framework.confidence,
      });
    }

    // Store language info as technologies too
    for (const [lang, info] of Object.entries(analysisResults.languages)) {
      db.addTechnology({
        projectId,
        name: lang,
        category: 'language',
        filePath: info.extensions.join(', '),
        confidence: 1.0,
      });
    }

    db.addHistoryEntry({
      projectId,
      agent: 'Analyzer',
      action: 'analysis_complete',
      description: `Detected ${analysisResults.frameworks.length} frameworks, ${Object.keys(analysisResults.languages).length} languages, ${analysisResults.issues.length} issues`,
      details: analysisResults.summary,
    });

    updateProgress(projectId, pipelineId, 'analysis', 15);

    // ═══════════════════════════════════════════
    // Stage 2: Dependency Management (Agent 8)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'dependencies', 15);

    const depResults = await manageDependencies(upgradedDir, analysisResults);
    results.stages.dependencies = depResults;

    // Store dependency suggestions
    for (const dep of depResults.outdated) {
      db.addSuggestion({
        projectId,
        technology: dep.name,
        description: `Update ${dep.name} from ${dep.currentVersion} to ${dep.latestVersion || 'latest'}`,
        priority: dep.majorUpdate ? 'high' : 'medium',
        category: 'dependency',
        autoFixable: !dep.majorUpdate,
        filePath: dep.type === 'dependencies' ? 'package.json' : dep.type,
      });
    }

    for (const dep of depResults.deprecated) {
      db.addSuggestion({
        projectId,
        technology: dep.name,
        description: `${dep.name} is deprecated: ${dep.reason}. Replace with ${dep.replacement}`,
        priority: 'high',
        category: 'deprecated',
        autoFixable: false,
      });
    }

    db.addHistoryEntry({
      projectId,
      agent: 'DependencyManager',
      action: 'dependencies_analyzed',
      description: `Found ${depResults.outdated.length} outdated, ${depResults.deprecated.length} deprecated, upgraded ${depResults.upgraded.length}`,
      details: { outdated: depResults.outdated.length, deprecated: depResults.deprecated.length, upgraded: depResults.upgraded.length },
    });

    updateProgress(projectId, pipelineId, 'dependencies', 30);

    // ═══════════════════════════════════════════
    // Stage 3: Rule-Based Transformations (Agent 6)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'rule-transform', 30);

    const ruleResults = await applyRuleTransformations(upgradedDir, analysisResults);
    results.stages.ruleTransform = ruleResults;

    // Store transformation suggestions
    for (const transformation of ruleResults.transformations) {
      for (const changeSet of transformation.changes) {
        db.addSuggestion({
          projectId,
          technology: changeSet.ruleName,
          description: `${changeSet.ruleName}: ${changeSet.changes.length} changes`,
          priority: changeSet.priority,
          category: 'rule-transform',
          autoFixable: true,
          filePath: transformation.file,
          status: 'applied',
        });
      }
    }

    db.addHistoryEntry({
      projectId,
      agent: 'RuleTransformer',
      action: 'rules_applied',
      description: `Applied ${ruleResults.totalChanges} rule-based changes across ${ruleResults.totalFiles} files`,
      details: { files: ruleResults.totalFiles, changes: ruleResults.totalChanges },
    });

    updateProgress(projectId, pipelineId, 'rule-transform', 50);

    // ═══════════════════════════════════════════
    // Stage 4: AI-Based Transformations (Agent 7)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'ai-transform', 50);

    const aiResults = await applyAiTransformations(upgradedDir, analysisResults);
    results.stages.aiTransform = aiResults;

    db.addHistoryEntry({
      projectId,
      agent: 'AITransformer',
      action: 'ai_transforms_applied',
      description: `Applied ${aiResults.totalChanges} AI-based changes across ${aiResults.totalFiles} files (mode: ${aiResults.mode})`,
      details: { files: aiResults.totalFiles, changes: aiResults.totalChanges, mode: aiResults.mode },
    });

    updateProgress(projectId, pipelineId, 'ai-transform', 70);

    // ═══════════════════════════════════════════
    // Stage 5: Validation & Testing (Agent 9)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'validation', 70);

    const validationResults = await validateProject(upgradedDir, analysisResults);
    results.stages.validation = validationResults;

    db.addHistoryEntry({
      projectId,
      agent: 'Validator',
      action: 'validation_complete',
      description: `Validation ${validationResults.passed ? 'PASSED' : 'FAILED'}: ${validationResults.passedChecks}/${validationResults.totalChecks} checks passed, ${validationResults.warnings} warnings`,
      status: validationResults.passed ? 'success' : 'warning',
      details: {
        passed: validationResults.passed,
        checks: validationResults.totalChecks,
        passedChecks: validationResults.passedChecks,
        failedChecks: validationResults.failedChecks,
      },
    });

    updateProgress(projectId, pipelineId, 'validation', 85);

    // ═══════════════════════════════════════════
    // Stage 6: Diff Generation (Agent 10)
    // ═══════════════════════════════════════════
    updateProgress(projectId, pipelineId, 'diff-generation', 85);

    const diffResults = await generateDiffs(originalDir, upgradedDir);
    results.stages.diffs = diffResults;

    // Store diffs in database
    db.clearDiffResults(projectId);
    for (const diff of diffResults.diffs) {
      db.addDiffResult({
        projectId,
        filePath: diff.filePath,
        originalContent: diff.originalContent,
        upgradedContent: diff.upgradedContent,
        diffContent: diff.diff,
        changeType: diff.changeType,
      });
    }

    db.addHistoryEntry({
      projectId,
      agent: 'DiffGenerator',
      action: 'diffs_generated',
      description: `Generated diffs: ${diffResults.modifiedFiles} modified, ${diffResults.addedFiles} added, ${diffResults.deletedFiles} deleted`,
      details: {
        modified: diffResults.modifiedFiles,
        added: diffResults.addedFiles,
        deleted: diffResults.deletedFiles,
        additions: diffResults.totalAdditions,
        deletions: diffResults.totalDeletions,
      },
    });

    updateProgress(projectId, pipelineId, 'diff-generation', 100);

    // ═══════════════════════════════════════════
    // Pipeline Complete
    // ═══════════════════════════════════════════
    results.overallStatus = validationResults.passed ? 'success' : 'completed_with_warnings';

    db.updateProject(projectId, {
      status: results.overallStatus === 'success' ? 'completed' : 'completed_with_warnings',
    });

    db.updatePipelineRun(pipelineId, {
      status: results.overallStatus,
      progress: 100,
      current_stage: 'complete',
      completed_at: new Date().toISOString(),
    });

    db.addHistoryEntry({
      projectId,
      agent: 'Orchestrator',
      action: 'pipeline_complete',
      description: `Pipeline completed with status: ${results.overallStatus}`,
      status: results.overallStatus,
    });

    logger.info('Pipeline: Upgrade pipeline completed', {
      projectId,
      status: results.overallStatus,
    });
  } catch (err) {
    logger.error('Pipeline: Pipeline failed', {
      projectId,
      error: err.message,
      stack: err.stack,
    });

    results.overallStatus = 'failed';
    results.error = err.message;

    db.updateProject(projectId, { status: 'failed' });
    db.updatePipelineRun(pipelineId, {
      status: 'failed',
      error: err.message,
      completed_at: new Date().toISOString(),
    });

    db.addHistoryEntry({
      projectId,
      agent: 'Orchestrator',
      action: 'pipeline_failed',
      description: `Pipeline failed: ${err.message}`,
      status: 'error',
    });
  } finally {
    activePipelines.delete(projectId);
  }

  return results;
}

/**
 * Update progress for a pipeline stage.
 */
function updateProgress(projectId, pipelineId, stageId, progress) {
  const stage = STAGES.find((s) => s.id === stageId);
  const pipeline = activePipelines.get(projectId);

  if (pipeline) {
    pipeline.currentStage = stageId;
    pipeline.progress = progress;
    pipeline.stages[stageId] = {
      name: stage?.name || stageId,
      agent: stage?.agent || '',
      status: 'running',
      startedAt: new Date().toISOString(),
    };
  }

  db.updatePipelineRun(pipelineId, {
    current_stage: stageId,
    progress,
  });
}

/**
 * Get the current progress of a pipeline.
 */
export function getPipelineProgress(projectId) {
  const active = activePipelines.get(projectId);
  if (active) return active;

  // Check database for completed runs
  const run = db.getLatestPipelineRun(projectId);
  if (run) {
    return {
      pipelineId: run.id,
      projectId,
      status: run.status,
      currentStage: run.current_stage,
      progress: run.progress,
    };
  }

  return null;
}

/**
 * Get available pipeline stages.
 */
export function getStages() {
  return STAGES;
}

export default { runPipeline, getPipelineProgress, getStages };
