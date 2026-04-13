import fs from 'fs';
import path from 'path';
import { readFileContent, writeFileContent } from '../utils/fileUtils.js';
import logger from '../middleware/logger.js';

/**
 * Agent 8: Dependency & Version Manager
 * Analyzes package files (package.json, requirements.txt, etc.),
 * detects outdated dependencies, and upgrades them safely.
 */

// Known latest major versions for popular packages (fallback when registry is unavailable)
const KNOWN_VERSIONS = {
  // React ecosystem
  'react': '18.3.1',
  'react-dom': '18.3.1',
  'react-router-dom': '6.28.0',
  'react-scripts': '5.0.1',
  'next': '15.0.3',
  '@types/react': '18.3.12',

  // Vue ecosystem
  'vue': '3.5.12',
  'vue-router': '4.4.5',
  'vuex': '4.1.0',

  // Angular
  '@angular/core': '19.0.1',
  '@angular/cli': '19.0.2',

  // Build tools
  'webpack': '5.96.1',
  'vite': '6.0.0',
  'esbuild': '0.24.0',
  'rollup': '4.27.3',
  
  // Testing
  'jest': '29.7.0',
  'mocha': '10.8.2',
  'vitest': '2.1.5',
  '@testing-library/react': '16.0.1',

  // CSS frameworks
  'tailwindcss': '3.4.15',
  'bootstrap': '5.3.3',

  // Utilities
  'lodash': '4.17.21',
  'axios': '1.7.7',
  'express': '4.21.1',
  'moment': '2.30.1',
  'dayjs': '1.11.13',
  'typescript': '5.7.2',
  'eslint': '9.15.0',
  'prettier': '3.4.1',
};

// Deprecated packages and their modern replacements
const DEPRECATED_PACKAGES = {
  'request': { replacement: 'node-fetch or axios', reason: 'Deprecated in 2020' },
  'node-sass': { replacement: 'sass', reason: 'node-sass is deprecated, use Dart Sass' },
  'tslint': { replacement: 'eslint with @typescript-eslint', reason: 'TSLint is deprecated' },
  'moment': { replacement: 'dayjs or date-fns', reason: 'Moment.js recommends alternatives' },
  'enzyme': { replacement: '@testing-library/react', reason: 'Enzyme lacks React 18 support' },
  'create-react-class': { replacement: 'ES6 classes or functional components', reason: 'Deprecated' },
  'react-addons-css-transition-group': { replacement: 'react-transition-group', reason: 'Deprecated' },
  'left-pad': { replacement: 'String.prototype.padStart()', reason: 'Built-in since ES2017' },
  'querystring': { replacement: 'URLSearchParams', reason: 'Built-in API available' },
  'bower': { replacement: 'npm or yarn', reason: 'Bower is deprecated' },
};

/**
 * Analyze dependencies and suggest/apply upgrades.
 * @param {string} projectDir - Path to the project directory.
 * @param {object} analysisResults - Results from the analyzer.
 * @returns {object} Dependency upgrade results.
 */
export async function manageDependencies(projectDir, analysisResults) {
  logger.info('Agent 8: Starting dependency analysis', { projectDir });

  const results = {
    packageManagers: [],
    outdated: [],
    deprecated: [],
    upgraded: [],
    errors: [],
  };

  // Process package.json (npm/yarn/pnpm)
  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const npmResult = await processPackageJson(pkgJsonPath);
    results.packageManagers.push('npm');
    results.outdated.push(...npmResult.outdated);
    results.deprecated.push(...npmResult.deprecated);
    results.upgraded.push(...npmResult.upgraded);
    results.errors.push(...npmResult.errors);
  }

  // Process requirements.txt (Python/pip)
  const reqTxtPath = path.join(projectDir, 'requirements.txt');
  if (fs.existsSync(reqTxtPath)) {
    const pipResult = processRequirementsTxt(reqTxtPath);
    results.packageManagers.push('pip');
    results.outdated.push(...pipResult.outdated);
    results.upgraded.push(...pipResult.upgraded);
  }

  // Process Gemfile (Ruby/Bundler)
  const gemfilePath = path.join(projectDir, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    results.packageManagers.push('bundler');
    // Basic detection — full Gemfile parsing would need a Ruby-specific parser
  }

  // Process pom.xml (Java/Maven)
  const pomPath = path.join(projectDir, 'pom.xml');
  if (fs.existsSync(pomPath)) {
    results.packageManagers.push('maven');
  }

  logger.info('Agent 8: Dependency analysis complete', {
    managers: results.packageManagers,
    outdated: results.outdated.length,
    deprecated: results.deprecated.length,
    upgraded: results.upgraded.length,
  });

  return results;
}

/**
 * Process package.json — detect outdated/deprecated deps and upgrade.
 */
async function processPackageJson(pkgJsonPath) {
  const result = { outdated: [], deprecated: [], upgraded: [], errors: [] };

  try {
    const content = readFileContent(pkgJsonPath);
    const pkg = JSON.parse(content);
    let modified = false;

    // Process both dependencies and devDependencies
    for (const depType of ['dependencies', 'devDependencies']) {
      if (!pkg[depType]) continue;

      for (const [name, currentVersionSpec] of Object.entries(pkg[depType])) {
        const currentVersion = currentVersionSpec.replace(/[\^~>=<\s]/g, '');

        // Check if deprecated
        if (DEPRECATED_PACKAGES[name]) {
          result.deprecated.push({
            name,
            currentVersion: currentVersionSpec,
            type: depType,
            ...DEPRECATED_PACKAGES[name],
          });
        }

        // Check if outdated (using known versions)
        if (KNOWN_VERSIONS[name]) {
          const latestVersion = KNOWN_VERSIONS[name];
          const currentMajor = parseInt(currentVersion.split('.')[0], 10);
          const latestMajor = parseInt(latestVersion.split('.')[0], 10);

          if (currentMajor < latestMajor || isVersionLower(currentVersion, latestVersion)) {
            result.outdated.push({
              name,
              currentVersion: currentVersionSpec,
              latestVersion,
              type: depType,
              majorUpdate: currentMajor < latestMajor,
            });

            // Safe upgrade: only patch & minor for non-major version bumps
            // For major bumps, just record as suggestion
            if (currentMajor < latestMajor) {
              // Major upgrade — don't auto-apply, just suggest
              result.outdated[result.outdated.length - 1].autoUpgrade = false;
            } else {
              // Minor/patch — safe to upgrade
              const prefix = currentVersionSpec.match(/^[\^~]/)?.[0] || '^';
              pkg[depType][name] = `${prefix}${latestVersion}`;
              modified = true;
              result.upgraded.push({
                name,
                from: currentVersionSpec,
                to: `${prefix}${latestVersion}`,
                type: depType,
              });
            }
          }
        }
      }
    }

    // Update engines if needed
    if (pkg.engines?.node) {
      const nodeVersion = pkg.engines.node.replace(/[>=<\s]/g, '');
      const nodeMajor = parseInt(nodeVersion.split('.')[0], 10);
      if (nodeMajor < 18) {
        result.outdated.push({
          name: 'node (engines)',
          currentVersion: pkg.engines.node,
          latestVersion: '>=18.0.0',
          type: 'engines',
          majorUpdate: true,
          autoUpgrade: false,
        });
      }
    }

    if (modified) {
      writeFileContent(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  } catch (err) {
    result.errors.push({
      file: 'package.json',
      error: err.message,
    });
    logger.warn('Agent 8: Failed to process package.json', { error: err.message });
  }

  return result;
}

/**
 * Process requirements.txt — detect outdated Python packages.
 */
function processRequirementsTxt(reqPath) {
  const result = { outdated: [], upgraded: [] };

  try {
    const content = readFileContent(reqPath);
    const lines = content.split('\n');
    const newLines = [];
    let modified = false;

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)==([\d.]+)/);
      if (match) {
        const [, name, version] = match;
        // Basic check — in a real system, we'd query PyPI
        const majorVersion = parseInt(version.split('.')[0], 10);

        // Flag potentially outdated packages
        result.outdated.push({
          name,
          currentVersion: version,
          type: 'pip',
          note: 'Check PyPI for latest version',
        });
        newLines.push(line);
      } else {
        newLines.push(line);
      }
    }

    if (modified) {
      writeFileContent(reqPath, newLines.join('\n'));
    }
  } catch (err) {
    logger.warn('Agent 8: Failed to process requirements.txt', { error: err.message });
  }

  return result;
}

/**
 * Basic version comparison (semver-like).
 */
function isVersionLower(current, latest) {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (cv < lv) return true;
    if (cv > lv) return false;
  }
  return false;
}

export default { manageDependencies };
