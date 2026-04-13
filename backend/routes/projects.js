import { Router } from 'express';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getAllFiles, buildFileTree, readFileContent } from '../utils/fileUtils.js';
import * as db from '../database/queries.js';
import logger from '../middleware/logger.js';

const router = Router();

/**
 * GET /api/projects
 * List all projects.
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const projects = await db.getAllProjects(req.user.id);
    res.json({ success: true, data: projects });
  })
);

/**
 * GET /api/projects/:id
 * Get a single project with all details.
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Include technologies and suggestions
    const technologies = await db.getTechnologies(req.params.id);
    const suggestions = await db.getSuggestions(req.params.id);
    const history = await db.getHistory(req.params.id);

    res.json({
      success: true,
      data: {
        ...project,
        technologies,
        suggestions,
        history,
      },
    });
  })
);

/**
 * GET /api/projects/:id/tree
 * Get the file tree for a project.
 */
router.get(
  '/:id/tree',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const targetDir = req.query.type === 'upgraded' && project.upgraded_path
      ? project.upgraded_path
      : project.original_path;

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ success: false, error: 'Project files not found on disk' });
    }

    const files = getAllFiles(targetDir);
    const tree = buildFileTree(files);

    res.json({ success: true, data: { tree, fileCount: files.length } });
  })
);

/**
 * GET /api/projects/:id/file
 * Get content of a specific file.
 */
router.get(
  '/:id/file',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { path: filePath, type } = req.query;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    const baseDir = type === 'upgraded' && project.upgraded_path
      ? project.upgraded_path
      : project.original_path;

    const fullPath = `${baseDir}/${filePath}`;

    // Security: ensure path stays within project directory
    const resolvedBase = fs.realpathSync(baseDir);
    let resolvedFull;
    try {
      resolvedFull = fs.realpathSync(fullPath);
    } catch {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (!resolvedFull.startsWith(resolvedBase)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const content = readFileContent(fullPath);
    if (content === null) {
      return res.status(400).json({ success: false, error: 'Cannot read binary file' });
    }

    res.json({ success: true, data: { content, path: filePath } });
  })
);

/**
 * DELETE /api/projects/:id
 * Delete a project and its files.
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Delete files from disk
    const projectDir = project.original_path.replace(/[/\\]original$/, '');
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    // Delete from database
    await db.deleteProject(req.params.id);

    logger.info('Project deleted', { projectId: req.params.id });
    res.json({ success: true, message: 'Project deleted' });
  })
);

export default router;
