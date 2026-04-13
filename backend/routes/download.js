import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createZip } from '../utils/zipUtils.js';
import * as db from '../database/queries.js';
import logger from '../middleware/logger.js';

const router = Router();

/**
 * GET /api/download/:id
 * Download the upgraded project as a ZIP file.
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!project.upgraded_path || !fs.existsSync(project.upgraded_path)) {
      return res.status(400).json({
        success: false,
        error: 'Upgraded project not available',
        message: 'Please run the upgrade pipeline first.',
      });
    }

    // Create ZIP from upgraded directory
    const projectDir = project.upgraded_path.replace(/[/\\]upgraded$/, '');
    const zipName = `${project.name}-upgraded.zip`;
    const zipPath = path.join(projectDir, zipName);

    await createZip(project.upgraded_path, zipPath);

    logger.info('Download started', { projectId: req.params.id, zipPath });

    res.download(zipPath, zipName, (err) => {
      if (err) {
        logger.error('Download failed', { error: err.message });
      }
      // Clean up the ZIP file after download
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    });
  })
);

/**
 * GET /api/download/:id/original
 * Download the original project as a ZIP file.
 */
router.get(
  '/:id/original',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!fs.existsSync(project.original_path)) {
      return res.status(404).json({ success: false, error: 'Original files not found' });
    }

    const projectDir = project.original_path.replace(/[/\\]original$/, '');
    const zipName = `${project.name}-original.zip`;
    const zipPath = path.join(projectDir, zipName);

    await createZip(project.original_path, zipPath);

    res.download(zipPath, zipName, () => {
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    });
  })
);

export default router;
