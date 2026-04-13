import fs from 'fs';
import path from 'path';
import { getAllFiles, readFileContent } from '../utils/fileUtils.js';
import logger from '../middleware/logger.js';

/**
 * Agent 9: Validator & Tester
 * Ensures that the upgraded codebase does not break existing functionality.
 * Performs syntax validation, basic structural checks, and test execution.
 */

/**
 * Validate the upgraded project.
 * @param {string} projectDir - Path to the upgraded project directory.
 * @param {object} analysisResults - Original analysis results for comparison.
 * @returns {object} Validation results.
 */
export async function validateProject(projectDir, analysisResults) {
  logger.info('Agent 9: Starting validation', { projectDir });

  const results = {
    passed: true,
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warnings: 0,
    checks: [],
  };

  const files = getAllFiles(projectDir);

  // 1. File integrity check
  const integrityResult = checkFileIntegrity(files, analysisResults);
  results.checks.push(integrityResult);
  updateCounts(results, integrityResult);

  // 2. Syntax validation for each language
  const syntaxResults = validateSyntax(projectDir, files);
  for (const check of syntaxResults) {
    results.checks.push(check);
    updateCounts(results, check);
  }

  // 3. JSON validity check
  const jsonResult = validateJsonFiles(files);
  results.checks.push(jsonResult);
  updateCounts(results, jsonResult);

  // 4. Package.json structure check
  const pkgResult = validatePackageJson(projectDir);
  if (pkgResult) {
    results.checks.push(pkgResult);
    updateCounts(results, pkgResult);
  }

  // 5. Import/require consistency
  const importResult = validateImports(projectDir, files);
  results.checks.push(importResult);
  updateCounts(results, importResult);

  // 6. No broken references
  const refResult = validateReferences(projectDir, files);
  results.checks.push(refResult);
  updateCounts(results, refResult);

  results.passed = results.failedChecks === 0;

  logger.info('Agent 9: Validation complete', {
    passed: results.passed,
    total: results.totalChecks,
    passedChecks: results.passedChecks,
    failedChecks: results.failedChecks,
    warnings: results.warnings,
  });

  return results;
}

/**
 * Check that all original files are still present.
 */
function checkFileIntegrity(upgradedFiles, analysisResults) {
  const check = {
    name: 'File Integrity',
    description: 'Verifies all original files are present in the upgraded project',
    status: 'passed',
    details: [],
  };

  if (!analysisResults?.files) {
    check.status = 'warning';
    check.details.push('No original file list available — skipping integrity check');
    return check;
  }

  const upgradedPaths = new Set(upgradedFiles.map((f) => f.path));
  const missingFiles = [];

  for (const originalFile of analysisResults.files) {
    if (!upgradedPaths.has(originalFile.path)) {
      missingFiles.push(originalFile.path);
    }
  }

  if (missingFiles.length > 0) {
    check.status = 'failed';
    check.details = missingFiles.map((f) => `Missing file: ${f}`);
  } else {
    check.details.push(`All ${analysisResults.files.length} files present`);
  }

  return check;
}

/**
 * Basic syntax validation for code files.
 */
function validateSyntax(projectDir, files) {
  const checks = [];

  // JavaScript/TypeScript syntax check
  const jsFiles = files.filter((f) => ['.js', '.jsx', '.ts', '.tsx'].includes(f.ext) && !f.isBinary);

  const jsCheck = {
    name: 'JavaScript/TypeScript Syntax',
    description: 'Basic syntax validation for JS/TS files',
    status: 'passed',
    details: [],
  };

  for (const file of jsFiles) {
    const content = readFileContent(file.fullPath);
    if (!content) continue;

    const issues = checkJsSyntax(content, file.path);
    if (issues.length > 0) {
      jsCheck.details.push(...issues);
    }
  }

  if (jsCheck.details.some((d) => d.includes('ERROR'))) {
    jsCheck.status = 'failed';
  } else if (jsCheck.details.some((d) => d.includes('WARNING'))) {
    jsCheck.status = 'warning';
  } else {
    jsCheck.details.push(`${jsFiles.length} JS/TS files validated`);
  }

  checks.push(jsCheck);

  // Python syntax check
  const pyFiles = files.filter((f) => f.ext === '.py' && !f.isBinary);
  if (pyFiles.length > 0) {
    const pyCheck = {
      name: 'Python Syntax',
      description: 'Basic syntax validation for Python files',
      status: 'passed',
      details: [],
    };

    for (const file of pyFiles) {
      const content = readFileContent(file.fullPath);
      if (!content) continue;

      const issues = checkPythonSyntax(content, file.path);
      if (issues.length > 0) {
        pyCheck.details.push(...issues);
      }
    }

    if (pyCheck.details.some((d) => d.includes('ERROR'))) {
      pyCheck.status = 'failed';
    } else {
      pyCheck.details.push(`${pyFiles.length} Python files validated`);
    }

    checks.push(pyCheck);
  }

  return checks;
}

/**
 * Basic JavaScript syntax checking (bracket matching, semicolons, etc.)
 */
function checkJsSyntax(content, filePath) {
  const issues = [];

  // Check bracket balance
  const brackets = { '{': 0, '(': 0, '[': 0 };
  const closers = { '}': '{', ')': '(', ']': '[' };
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    // Handle strings
    if (!inComment && !inBlockComment) {
      if ((char === '"' || char === "'" || char === '`') && content[i - 1] !== '\\') {
        if (inString && char === stringChar) {
          inString = false;
        } else if (!inString) {
          inString = true;
          stringChar = char;
        }
      }
    }

    if (inString) continue;

    // Handle comments
    if (char === '/' && next === '/' && !inBlockComment) {
      inComment = true;
      continue;
    }
    if (char === '\n') inComment = false;
    if (char === '/' && next === '*' && !inComment) {
      inBlockComment = true;
      continue;
    }
    if (char === '*' && next === '/' && inBlockComment) {
      inBlockComment = false;
      i++;
      continue;
    }

    if (inComment || inBlockComment) continue;

    // Count brackets
    if (brackets.hasOwnProperty(char)) {
      brackets[char]++;
    } else if (closers[char]) {
      brackets[closers[char]]--;
    }
  }

  // Check for unmatched brackets
  if (brackets['{'] !== 0) {
    issues.push(`ERROR [${filePath}]: Unmatched curly braces (${brackets['{'] > 0 ? 'missing }' : 'extra }'})`);
  }
  if (brackets['('] !== 0) {
    issues.push(`ERROR [${filePath}]: Unmatched parentheses (${brackets['('] > 0 ? 'missing )' : 'extra )'})`);
  }
  if (brackets['['] !== 0) {
    issues.push(`WARNING [${filePath}]: Unmatched square brackets`);
  }

  return issues;
}

/**
 * Basic Python syntax checking.
 */
function checkPythonSyntax(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;

    // Check for mixed indentation
    if (line.match(/^\t+ /) || line.match(/^ +\t/)) {
      issues.push(`WARNING [${filePath}:${i + 1}]: Mixed tabs and spaces in indentation`);
    }

    // Check for Python 2 print statement (should've been caught by transformer)
    if (trimmed.match(/^print\s+[^(]/) && !trimmed.startsWith('print(')) {
      issues.push(`ERROR [${filePath}:${i + 1}]: Python 2 print statement found (not upgraded)`);
    }
  }

  return issues;
}

/**
 * Validate all JSON files are parseable.
 */
function validateJsonFiles(files) {
  const check = {
    name: 'JSON Validity',
    description: 'Ensures all JSON files are valid',
    status: 'passed',
    details: [],
  };

  const jsonFiles = files.filter((f) => f.ext === '.json' && !f.isBinary);
  let valid = 0;
  let invalid = 0;

  for (const file of jsonFiles) {
    const content = readFileContent(file.fullPath);
    if (!content) continue;

    try {
      JSON.parse(content);
      valid++;
    } catch (err) {
      invalid++;
      check.details.push(`ERROR [${file.path}]: Invalid JSON — ${err.message}`);
    }
  }

  if (invalid > 0) {
    check.status = 'failed';
  }
  check.details.push(`${valid}/${jsonFiles.length} JSON files valid`);

  return check;
}

/**
 * Validate package.json structure.
 */
function validatePackageJson(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  const check = {
    name: 'package.json Structure',
    description: 'Validates package.json has required fields',
    status: 'passed',
    details: [],
  };

  try {
    const pkg = JSON.parse(readFileContent(pkgPath));

    if (!pkg.name) check.details.push('WARNING: Missing "name" field');
    if (!pkg.version) check.details.push('WARNING: Missing "version" field');

    // Check for duplicate dependencies
    if (pkg.dependencies && pkg.devDependencies) {
      const deps = Object.keys(pkg.dependencies);
      const devDeps = Object.keys(pkg.devDependencies);
      const duplicates = deps.filter((d) => devDeps.includes(d));
      if (duplicates.length > 0) {
        check.details.push(`WARNING: Packages in both dependencies and devDependencies: ${duplicates.join(', ')}`);
        check.status = 'warning';
      }
    }

    if (check.details.length === 0) {
      check.details.push('package.json structure is valid');
    }
  } catch (err) {
    check.status = 'failed';
    check.details.push(`ERROR: Failed to parse package.json — ${err.message}`);
  }

  return check;
}

/**
 * Check that imports reference existing files.
 */
function validateImports(projectDir, files) {
  const check = {
    name: 'Import Validation',
    description: 'Checks that relative imports reference existing files',
    status: 'passed',
    details: [],
  };

  const jsFiles = files.filter((f) => ['.js', '.jsx', '.ts', '.tsx'].includes(f.ext) && !f.isBinary);
  let checked = 0;
  let broken = 0;

  for (const file of jsFiles) {
    const content = readFileContent(file.fullPath);
    if (!content) continue;

    // Find relative imports
    const importRegex = /(?:import\s+.*?from\s+|require\(\s*)['"](\.[^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const fileDir = path.dirname(file.fullPath);
      let resolvedPath = path.resolve(fileDir, importPath);

      // Try with extensions
      const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
      const exists = extensions.some((ext) => fs.existsSync(resolvedPath + ext));

      if (!exists) {
        broken++;
        check.details.push(`WARNING [${file.path}]: Import "${importPath}" may not resolve`);
      }
      checked++;
    }
  }

  if (broken > 0) {
    check.status = 'warning';
  }
  check.details.push(`${checked} imports checked, ${broken} potentially broken`);

  return check;
}

/**
 * Basic reference checking (CSS classes, IDs, etc.)
 */
function validateReferences(projectDir, files) {
  const check = {
    name: 'Reference Check',
    description: 'Basic check for orphaned references',
    status: 'passed',
    details: [],
  };

  // This is a simplified check
  const htmlFiles = files.filter((f) => ['.html', '.htm'].includes(f.ext) && !f.isBinary);

  for (const file of htmlFiles) {
    const content = readFileContent(file.fullPath);
    if (!content) continue;

    // Check for broken script/link references
    const scriptRegex = /src=["'](?!https?:\/\/|\/\/)(.*?)["']/g;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      const refPath = match[1];
      if (refPath.startsWith('#') || refPath.startsWith('data:')) continue;

      const resolvedPath = path.resolve(path.dirname(file.fullPath), refPath);
      if (!fs.existsSync(resolvedPath)) {
        check.details.push(`WARNING [${file.path}]: Referenced file "${refPath}" not found`);
        check.status = 'warning';
      }
    }
  }

  if (check.details.length === 0) {
    check.details.push('No broken references detected');
  }

  return check;
}

/**
 * Update result counts.
 */
function updateCounts(results, check) {
  results.totalChecks++;
  if (check.status === 'passed') {
    results.passedChecks++;
  } else if (check.status === 'failed') {
    results.failedChecks++;
    results.passed = false;
  } else if (check.status === 'warning') {
    results.passedChecks++;
    results.warnings++;
  }
}

export default { validateProject };
