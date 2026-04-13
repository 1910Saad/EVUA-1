import AdmZip from 'adm-zip';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import logger from '../middleware/logger.js';

/**
 * Extract a ZIP file to a target directory.
 */
export function extractZip(zipPath, targetDir) {
  logger.info('Extracting ZIP', { zipPath, targetDir });

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true);

  // Check if ZIP contains a single root folder — if so, flatten
  const entries = fs.readdirSync(targetDir);
  if (entries.length === 1) {
    const singleEntry = path.join(targetDir, entries[0]);
    if (fs.statSync(singleEntry).isDirectory()) {
      const innerFiles = fs.readdirSync(singleEntry);
      for (const f of innerFiles) {
        const src = path.join(singleEntry, f);
        const dest = path.join(targetDir, f);
        fs.renameSync(src, dest);
      }
      fs.rmdirSync(singleEntry);
      logger.info('Flattened single root directory from ZIP');
    }
  }

  // Remove the original ZIP file
  fs.unlinkSync(zipPath);
  logger.info('ZIP extracted successfully', { targetDir });
  return targetDir;
}

/**
 * Create a ZIP file from a directory.
 */
export function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    logger.info('Creating ZIP', { sourceDir, outputPath });

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logger.info('ZIP created successfully', { outputPath, size: archive.pointer() });
      resolve(outputPath);
    });

    archive.on('error', (err) => {
      logger.error('ZIP creation failed', { error: err.message });
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export default { extractZip, createZip };
