import path from 'path';
import fs from 'fs';
import { getAllFiles, readFileContent } from '../utils/fileUtils.js';
import logger from '../middleware/logger.js';

/**
 * Agent 5: Project Analyzer
 * Scans the entire codebase, detects programming languages, frameworks,
 * versions, and identifies what needs to be upgraded.
 */

// Language detection by file extension
const LANGUAGE_MAP = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (JSX)',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (TSX)',
  '.py': 'Python',
  '.java': 'Java',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bat': 'Batch',
  '.ps1': 'PowerShell',
  '.md': 'Markdown',
  '.dockerfile': 'Docker',
};

// Framework detection patterns
const FRAMEWORK_PATTERNS = [
  // JavaScript Frameworks
  {
    name: 'React',
    category: 'frontend-framework',
    patterns: [
      { file: 'package.json', content: /"react"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: '**/*.jsx', content: /import\s+React\s+from\s+['"]react['"]/ },
      { file: '**/*.jsx', content: /React\.Component/ },
    ],
  },
  {
    name: 'Next.js',
    category: 'frontend-framework',
    patterns: [
      { file: 'package.json', content: /"next"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'next.config.js' },
      { file: 'next.config.mjs' },
    ],
  },
  {
    name: 'Angular',
    category: 'frontend-framework',
    patterns: [
      { file: 'package.json', content: /"@angular\/core"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'angular.json' },
    ],
  },
  {
    name: 'AngularJS',
    category: 'frontend-framework',
    patterns: [
      { file: 'package.json', content: /"angular"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: '**/*.js', content: /angular\.module\(/ },
    ],
    deprecated: true,
  },
  {
    name: 'Vue.js',
    category: 'frontend-framework',
    patterns: [
      { file: 'package.json', content: /"vue"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: '**/*.vue', content: /<template>/ },
    ],
  },
  {
    name: 'jQuery',
    category: 'frontend-library',
    patterns: [
      { file: 'package.json', content: /"jquery"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: '**/*.js', content: /\$\(\s*['"]|jQuery\(/ },
      { file: '**/*.html', content: /jquery[.-]\d/ },
    ],
    deprecated: true,
  },
  // Backend Frameworks
  {
    name: 'Express',
    category: 'backend-framework',
    patterns: [
      { file: 'package.json', content: /"express"\s*:\s*"([^"]+)"/, versionGroup: 1 },
    ],
  },
  {
    name: 'Django',
    category: 'backend-framework',
    patterns: [
      { file: 'requirements.txt', content: /Django==(\S+)/, versionGroup: 1 },
      { file: 'manage.py', content: /django/ },
    ],
  },
  {
    name: 'Flask',
    category: 'backend-framework',
    patterns: [
      { file: 'requirements.txt', content: /Flask==(\S+)/, versionGroup: 1 },
    ],
  },
  {
    name: 'Spring Boot',
    category: 'backend-framework',
    patterns: [
      { file: 'pom.xml', content: /spring-boot.*?<version>([^<]+)</, versionGroup: 1 },
      { file: 'build.gradle', content: /spring-boot.*?(\d+\.\d+\.\d+)/, versionGroup: 1 },
    ],
  },
  // Build Tools
  {
    name: 'Webpack',
    category: 'build-tool',
    patterns: [
      { file: 'package.json', content: /"webpack"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'webpack.config.js' },
    ],
  },
  {
    name: 'Vite',
    category: 'build-tool',
    patterns: [
      { file: 'package.json', content: /"vite"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'vite.config.js' },
    ],
  },
  {
    name: 'Gulp',
    category: 'build-tool',
    patterns: [
      { file: 'package.json', content: /"gulp"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'gulpfile.js' },
    ],
    deprecated: true,
  },
  {
    name: 'Grunt',
    category: 'build-tool',
    patterns: [
      { file: 'package.json', content: /"grunt"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'Gruntfile.js' },
    ],
    deprecated: true,
  },
  // Testing
  {
    name: 'Jest',
    category: 'testing',
    patterns: [
      { file: 'package.json', content: /"jest"\s*:\s*"([^"]+)"/, versionGroup: 1 },
    ],
  },
  {
    name: 'Mocha',
    category: 'testing',
    patterns: [
      { file: 'package.json', content: /"mocha"\s*:\s*"([^"]+)"/, versionGroup: 1 },
    ],
  },
  // CSS
  {
    name: 'Bootstrap',
    category: 'css-framework',
    patterns: [
      { file: 'package.json', content: /"bootstrap"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: '**/*.html', content: /bootstrap[.-]\d/ },
    ],
  },
  {
    name: 'Tailwind CSS',
    category: 'css-framework',
    patterns: [
      { file: 'package.json', content: /"tailwindcss"\s*:\s*"([^"]+)"/, versionGroup: 1 },
      { file: 'tailwind.config.js' },
    ],
  },
];

// Code pattern issues to detect
const CODE_ISSUES = [
  // JavaScript Issues
  {
    name: 'var-declarations',
    technology: 'JavaScript',
    pattern: /\bvar\s+\w+/g,
    description: 'Uses `var` instead of `let`/`const` (ES6+)',
    priority: 'medium',
    category: 'syntax',
    autoFixable: true,
    extensions: ['.js', '.jsx'],
  },
  {
    name: 'callback-hell',
    technology: 'JavaScript',
    pattern: /function\s*\([^)]*\)\s*\{[^}]*function\s*\(/g,
    description: 'Nested callbacks detected — consider using async/await',
    priority: 'medium',
    category: 'pattern',
    autoFixable: false,
    extensions: ['.js', '.jsx'],
  },
  {
    name: 'require-imports',
    technology: 'JavaScript',
    pattern: /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/g,
    description: 'Uses CommonJS `require()` — consider ES module `import`',
    priority: 'low',
    category: 'module-system',
    autoFixable: true,
    extensions: ['.js', '.jsx'],
  },
  {
    name: 'react-class-component',
    technology: 'React',
    pattern: /class\s+\w+\s+extends\s+(React\.)?Component/g,
    description: 'React class component — consider converting to functional component with hooks',
    priority: 'medium',
    category: 'react',
    autoFixable: false,
    extensions: ['.js', '.jsx', '.tsx'],
  },
  {
    name: 'react-createclass',
    technology: 'React',
    pattern: /React\.createClass\s*\(/g,
    description: 'Uses deprecated `React.createClass` — migrate to class or functional components',
    priority: 'high',
    category: 'react',
    autoFixable: false,
    extensions: ['.js', '.jsx'],
  },
  {
    name: 'react-proptypes-import',
    technology: 'React',
    pattern: /import\s+PropTypes\s+from\s+['"]prop-types['"]/g,
    description: 'Uses PropTypes runtime validation — consider TypeScript for static typing',
    priority: 'low',
    category: 'react',
    autoFixable: false,
    extensions: ['.js', '.jsx'],
  },
  {
    name: 'componentWillMount',
    technology: 'React',
    pattern: /componentWillMount\s*\(/g,
    description: 'Uses deprecated `componentWillMount` lifecycle — use `componentDidMount` or `useEffect`',
    priority: 'high',
    category: 'react',
    autoFixable: true,
    extensions: ['.js', '.jsx', '.tsx'],
  },
  {
    name: 'componentWillReceiveProps',
    technology: 'React',
    pattern: /componentWillReceiveProps\s*\(/g,
    description: 'Uses deprecated `componentWillReceiveProps` — use `getDerivedStateFromProps` or `useEffect`',
    priority: 'high',
    category: 'react',
    autoFixable: false,
    extensions: ['.js', '.jsx', '.tsx'],
  },
  // Python Issues
  {
    name: 'python2-print',
    technology: 'Python',
    pattern: /^print\s+[^(]/gm,
    description: 'Python 2 print statement — use `print()` function',
    priority: 'high',
    category: 'syntax',
    autoFixable: true,
    extensions: ['.py'],
  },
  {
    name: 'python2-except',
    technology: 'Python',
    pattern: /except\s+\w+\s*,\s*\w+/g,
    description: 'Python 2 except syntax — use `except Exception as e`',
    priority: 'high',
    category: 'syntax',
    autoFixable: true,
    extensions: ['.py'],
  },
  {
    name: 'python-old-format',
    technology: 'Python',
    pattern: /%\s*\(/g,
    description: 'Old-style string formatting — consider f-strings (Python 3.6+)',
    priority: 'low',
    category: 'syntax',
    autoFixable: false,
    extensions: ['.py'],
  },
  // CSS Issues
  {
    name: 'vendor-prefixes',
    technology: 'CSS',
    pattern: /-(webkit|moz|ms|o)-/g,
    description: 'Vendor prefixes detected — consider using autoprefixer',
    priority: 'low',
    category: 'css',
    autoFixable: false,
    extensions: ['.css', '.scss', '.less'],
  },
];

/**
 * Main analysis function.
 * @param {string} projectDir - Path to the extracted project directory.
 * @returns {object} Analysis results.
 */
export async function analyzeProject(projectDir) {
  logger.info('Agent 5: Starting project analysis', { projectDir });

  const files = getAllFiles(projectDir);

  // 1. Detect languages
  const languages = detectLanguages(files);

  // 2. Detect frameworks and libraries
  const frameworks = detectFrameworks(projectDir, files);

  // 3. Detect code issues
  const issues = detectCodeIssues(projectDir, files);

  // 4. Detect project configuration
  const projectConfig = detectProjectConfig(projectDir);

  const results = {
    summary: {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      languageCount: Object.keys(languages).length,
      frameworkCount: frameworks.length,
      issueCount: issues.length,
    },
    languages,
    frameworks,
    issues,
    config: projectConfig,
    files: files.map((f) => ({
      path: f.path,
      ext: f.ext,
      size: f.size,
      isBinary: f.isBinary,
    })),
  };

  logger.info('Agent 5: Analysis complete', { summary: results.summary });
  return results;
}

/**
 * Detect programming languages used in the project.
 */
function detectLanguages(files) {
  const langCount = {};

  for (const file of files) {
    const lang = LANGUAGE_MAP[file.ext];
    if (lang) {
      if (!langCount[lang]) {
        langCount[lang] = { count: 0, totalSize: 0, extensions: new Set() };
      }
      langCount[lang].count++;
      langCount[lang].totalSize += file.size;
      langCount[lang].extensions.add(file.ext);
    }
  }

  // Convert Sets to arrays for JSON serialization
  const result = {};
  for (const [lang, data] of Object.entries(langCount)) {
    result[lang] = {
      ...data,
      extensions: [...data.extensions],
      percentage: ((data.count / files.length) * 100).toFixed(1),
    };
  }

  return result;
}

/**
 * Detect frameworks and libraries used in the project.
 */
function detectFrameworks(projectDir, files) {
  const detected = [];

  for (const framework of FRAMEWORK_PATTERNS) {
    let version = null;
    let foundIn = null;
    let confidence = 0;

    for (const pattern of framework.patterns) {
      // Check for file existence
      if (!pattern.content) {
        const filePath = path.join(projectDir, pattern.file);
        if (fs.existsSync(filePath)) {
          confidence = Math.max(confidence, 0.9);
          foundIn = pattern.file;
        }
        continue;
      }

      // Check specific files
      let targetFiles = [];
      if (pattern.file.includes('*')) {
        // Glob pattern — search matching files
        const ext = path.extname(pattern.file);
        targetFiles = files.filter((f) => f.ext === ext).map((f) => f.fullPath);
      } else {
        const fp = path.join(projectDir, pattern.file);
        if (fs.existsSync(fp)) targetFiles = [fp];
      }

      for (const tf of targetFiles) {
        try {
          const content = fs.readFileSync(tf, 'utf-8');
          const match = content.match(pattern.content);
          if (match) {
            confidence = Math.max(confidence, 1.0);
            foundIn = path.relative(projectDir, tf).replace(/\\/g, '/');
            if (pattern.versionGroup && match[pattern.versionGroup]) {
              version = match[pattern.versionGroup].replace(/[\^~>=<]/g, '');
            }
            break;
          }
        } catch {
          // Skip unreadable files
        }
      }

      if (confidence >= 1.0) break;
    }

    if (confidence > 0) {
      detected.push({
        name: framework.name,
        category: framework.category,
        version,
        deprecated: framework.deprecated || false,
        confidence,
        foundIn,
      });
    }
  }

  return detected;
}

/**
 * Detect code patterns that need upgrading.
 */
function detectCodeIssues(projectDir, files) {
  const issues = [];

  for (const issue of CODE_ISSUES) {
    const targetFiles = files.filter((f) => issue.extensions.includes(f.ext) && !f.isBinary);

    for (const file of targetFiles) {
      try {
        const content = fs.readFileSync(file.fullPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(issue.pattern);
          if (match) {
            issues.push({
              name: issue.name,
              technology: issue.technology,
              description: issue.description,
              priority: issue.priority,
              category: issue.category,
              autoFixable: issue.autoFixable,
              filePath: file.path,
              line: i + 1,
              lineContent: lines[i].trim().substring(0, 200),
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return issues;
}

/**
 * Detect project configuration details.
 */
function detectProjectConfig(projectDir) {
  const config = {
    packageManager: null,
    moduleSystem: null,
    nodeVersion: null,
    pythonVersion: null,
  };

  // Check for package managers
  if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) config.packageManager = 'npm';
  else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) config.packageManager = 'yarn';
  else if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) config.packageManager = 'pnpm';
  else if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) config.packageManager = 'bun';

  // Check module system
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      config.moduleSystem = pkg.type === 'module' ? 'ESM' : 'CommonJS';

      if (pkg.engines?.node) config.nodeVersion = pkg.engines.node;
    } catch {
      // Skip if unreadable
    }
  }

  // Check for Python version
  const pyVersionFiles = ['runtime.txt', '.python-version', 'Pipfile'];
  for (const pvf of pyVersionFiles) {
    const pvPath = path.join(projectDir, pvf);
    if (fs.existsSync(pvPath)) {
      try {
        const content = fs.readFileSync(pvPath, 'utf-8');
        const match = content.match(/python-?(\d+\.\d+(?:\.\d+)?)/i);
        if (match) config.pythonVersion = match[1];
      } catch {
        // Skip
      }
    }
  }

  // Check for Docker
  config.hasDocker = fs.existsSync(path.join(projectDir, 'Dockerfile')) ||
    fs.existsSync(path.join(projectDir, 'docker-compose.yml')) ||
    fs.existsSync(path.join(projectDir, 'docker-compose.yaml'));

  // Check for CI/CD
  config.hasCi = fs.existsSync(path.join(projectDir, '.github/workflows')) ||
    fs.existsSync(path.join(projectDir, '.gitlab-ci.yml')) ||
    fs.existsSync(path.join(projectDir, 'Jenkinsfile')) ||
    fs.existsSync(path.join(projectDir, '.circleci'));

  return config;
}

export default { analyzeProject };
