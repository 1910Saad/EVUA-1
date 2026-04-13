import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { runPipeline, getPipelineProgress, getStages } from '../pipeline/orchestrator.js';
import * as db from '../database/queries.js';
import logger from '../middleware/logger.js';

const router = Router();

/**
 * POST /api/upgrade/:id
 * Start the upgrade pipeline for a project.
 */
router.post(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (project.status === 'processing') {
      return res.status(409).json({
        success: false,
        error: 'Pipeline already running',
        message: 'An upgrade pipeline is already in progress for this project.',
      });
    }

    logger.info('Starting upgrade pipeline', { projectId: req.params.id });

    // Start pipeline asynchronously
    const pipelinePromise = runPipeline(req.params.id, project.original_path);

    // Don't await — let it run in background
    pipelinePromise.catch((err) => {
      logger.error('Pipeline background error', { projectId: req.params.id, error: err.message });
    });

    // Return immediately with pipeline info
    res.json({
      success: true,
      data: {
        projectId: req.params.id,
        status: 'started',
        message: 'Upgrade pipeline started. Use GET /api/upgrade/:id/progress to track.',
        stages: getStages(),
      },
    });
  })
);

/**
 * GET /api/upgrade/:id/progress
 * Get the current progress of the upgrade pipeline.
 */
router.get(
  '/:id/progress',
  asyncHandler(async (req, res) => {
    const progress = getPipelineProgress(req.params.id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'No pipeline run found for this project',
      });
    }

    res.json({ success: true, data: progress });
  })
);

/**
 * GET /api/upgrade/:id/results
 * Get the complete results of an upgrade pipeline.
 */
router.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!['completed', 'completed_with_warnings', 'failed'].includes(project.status)) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline not complete',
        message: `Project status: ${project.status}`,
      });
    }

    const technologies = db.getTechnologies(req.params.id);
    const suggestions = db.getSuggestions(req.params.id);
    const history = db.getHistory(req.params.id);
    const diffs = db.getDiffResults(req.params.id);
    const pipelineRun = db.getLatestPipelineRun(req.params.id);

    res.json({
      success: true,
      data: {
        project,
        pipelineRun,
        technologies,
        suggestions,
        history,
        diffs: diffs.map((d) => ({
          id: d.id,
          filePath: d.file_path,
          changeType: d.change_type,
          diff: d.diff_content,
          originalContent: d.original_content,
          upgradedContent: d.upgraded_content,
        })),
      },
    });
  })
);

export default router;
