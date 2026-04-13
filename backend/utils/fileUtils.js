import fs from 'fs';
import path from 'path';

/**
 * Utility functions for file operations.
 */

// Binary file extensions to skip when reading content
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pyc', '.class', '.o', '.obj',
  '.sqlite', '.db',
  '.DS_Store',
]);

// Directories to skip when scanning
const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.next', '.nuxt',
  'dist', 'build', 'out', '.cache', '.vscode', '.idea',
  'vendor', 'bower_components', '.tox', '.eggs', '*.egg-info',
  'venv', 'env', '.env', 'coverage', '.nyc_output',
]);

/**
 * Recursively get all files in a directory.
 */
export function getAllFiles(dirPath, basePath = dirPath, result = []) {
  if (!fs.existsSync(dirPath)) return result;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        getAllFiles(fullPath, basePath, result);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const stats = fs.statSync(fullPath);
      result.push({
        path: relativePath,
        fullPath,
        name: entry.name,
        ext,
        size: stats.size,
        isBinary: BINARY_EXTENSIONS.has(ext),
      });
    }
  }

  return result;
}

/**
 * Build a tree structure from file list.
 */
export function buildFileTree(files) {
  const tree = { name: 'root', type: 'directory', children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const partName = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.children.push({
          name: partName,
          type: 'file',
          ext: file.ext,
          size: file.size,
          path: file.path,
          isBinary: file.isBinary,
        });
      } else {
        let dir = current.children.find((c) => c.name === partName && c.type === 'directory');
        if (!dir) {
          dir = { name: partName, type: 'directory', children: [] };
          current.children.push(dir);
        }
        current = dir;
      }
    }
  }

  return tree;
}

/**
 * Read file content safely (returns null for binary files).
 */
export function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return null;

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Write file content, creating directories if needed.
 */
export function writeFileContent(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Copy directory recursively.
 */
export function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get total size of all files.
 */
export function getTotalSize(files) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

export default {
  getAllFiles, buildFileTree, readFileContent, writeFileContent,
  copyDirectory, getTotalSize, BINARY_EXTENSIONS, SKIP_DIRS,
};
