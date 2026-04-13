import { Router } from 'express';
import path from 'path';
import upload from '../middleware/upload.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { extractZip } from '../utils/zipUtils.js';
import { getAllFiles, buildFileTree, getTotalSize } from '../utils/fileUtils.js';
import * as db from '../database/queries.js';
import logger from '../middleware/logger.js';

const router = Router();

/**
 * POST /api/upload
 * Upload a ZIP file containing a project codebase.
 */
router.post(
  '/',
  upload.single('project'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a .zip file using the "project" field.',
      });
    }

    const projectId = req.projectId;
    const projectDir = req.projectDir;
    const originalName = path.parse(req.file.originalname).name;

    logger.info('Upload received', {
      projectId,
      filename: req.file.originalname,
      size: req.file.size,
    });

    // Extract ZIP to /original subdirectory
    const originalDir = path.join(projectDir, 'original');
    extractZip(req.file.path, originalDir);

    // Scan extracted files
    const files = getAllFiles(originalDir);
    const fileTree = buildFileTree(files);
    const totalSize = getTotalSize(files);

    // Save to database
    db.createProject({
      id: projectId,
      name: originalName,
      originalPath: originalDir,
      fileCount: files.length,
      totalSize,
    });

    logger.info('Project uploaded successfully', {
      projectId,
      files: files.length,
      totalSize,
    });

    res.status(201).json({
      success: true,
      data: {
        projectId,
        name: originalName,
        fileCount: files.length,
        totalSize,
        fileTree,
      },
    });
  })
);

export default router;
