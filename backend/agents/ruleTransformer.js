import fs from 'fs';
import path from 'path';
import { getAllFiles, readFileContent, writeFileContent } from '../utils/fileUtils.js';
import logger from '../middleware/logger.js';

/**
 * Agent 6: Rule-Based Transformer
 * Applies safe, predefined transformations to upgrade the codebase.
 * Only applies transformations that are known to be safe and reversible.
 */

// Transformation rules — each returns { transformed: boolean, content: string, changes: [] }
const TRANSFORM_RULES = [
  // ============ JAVASCRIPT / TYPESCRIPT ============
  {
    id: 'var-to-const-let',
    name: 'Convert var to const/let',
    description: 'Replaces `var` declarations with `const` (or `let` for reassigned variables)',
    category: 'javascript',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    priority: 'medium',
    transform(content, filePath) {
      const changes = [];
      const lines = content.split('\n');
      const reassignedVars = new Set();

      // First pass: find reassigned variables
      for (const line of lines) {
        const assignMatch = line.match(/^\s*(\w+)\s*=[^=]/);
        if (assignMatch) reassignedVars.add(assignMatch[1]);

        const incMatch = line.match(/^\s*(\w+)\s*(\+\+|--|\+=|-=|\*=|\/=)/);
        if (incMatch) reassignedVars.add(incMatch[1]);
      }

      // Second pass: transform var declarations
      let newContent = content;
      const varRegex = /\bvar\s+(\w+)/g;
      let match;

      while ((match = varRegex.exec(content)) !== null) {
        const varName = match[1];
        const replacement = reassignedVars.has(varName) ? 'let' : 'const';

        // Calculate line number
        const beforeMatch = content.substring(0, match.index);
        const lineNum = beforeMatch.split('\n').length;

        changes.push({
          line: lineNum,
          from: `var ${varName}`,
          to: `${replacement} ${varName}`,
          description: `Changed \`var ${varName}\` to \`${replacement} ${varName}\``,
        });
      }

      if (changes.length > 0) {
        newContent = content.replace(/\bvar\s+(\w+)/g, (fullMatch, varName) => {
          const replacement = reassignedVars.has(varName) ? 'let' : 'const';
          return `${replacement} ${varName}`;
        });
      }

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },
  {
    id: 'require-to-import',
    name: 'Convert require to import',
    description: 'Converts CommonJS `require()` calls to ES module `import` statements',
    category: 'javascript',
    extensions: ['.js', '.jsx'],
    priority: 'low',
    transform(content, filePath) {
      const changes = [];
      let newContent = content;

      // const x = require('y') → import x from 'y'
      const simpleRequire = /const\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\);?/g;
      newContent = newContent.replace(simpleRequire, (full, name, module) => {
        const lineNum = content.substring(0, content.indexOf(full)).split('\n').length;
        changes.push({
          line: lineNum,
          from: full.trim(),
          to: `import ${name} from '${module}';`,
          description: `Converted require('${module}') to ES import`,
        });
        return `import ${name} from '${module}';`;
      });

      // const { a, b } = require('y') → import { a, b } from 'y'
      const destructRequire = /const\s+(\{[^}]+\})\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\);?/g;
      newContent = newContent.replace(destructRequire, (full, names, module) => {
        const lineNum = content.substring(0, content.indexOf(full)).split('\n').length;
        changes.push({
          line: lineNum,
          from: full.trim(),
          to: `import ${names} from '${module}';`,
          description: `Converted destructured require('${module}') to ES import`,
        });
        return `import ${names} from '${module}';`;
      });

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },
  {
    id: 'template-literals',
    name: 'Convert string concatenation to template literals',
    description: 'Replaces string concatenation with template literals',
    category: 'javascript',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    priority: 'low',
    transform(content) {
      const changes = [];
      // Simple pattern: "hello " + name + "!" → `hello ${name}!`
      const concatRegex = /(['"])([^'"]*)\1\s*\+\s*(\w+)\s*\+\s*(['"])([^'"]*)\4/g;
      let newContent = content;

      newContent = newContent.replace(concatRegex, (full, _q1, str1, varName, _q2, str2) => {
        const result = `\`${str1}\${${varName}}${str2}\``;
        changes.push({
          from: full,
          to: result,
          description: `Converted string concatenation to template literal`,
        });
        return result;
      });

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },
  {
    id: 'arrow-functions',
    name: 'Convert function expressions to arrow functions',
    description: 'Converts anonymous function expressions to arrow functions',
    category: 'javascript',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    priority: 'low',
    transform(content) {
      const changes = [];
      let newContent = content;

      // Simple: function(x) { return y; } → (x) => y
      const simpleReturn = /function\s*\(([^)]*)\)\s*\{\s*return\s+([^;]+);\s*\}/g;
      newContent = newContent.replace(simpleReturn, (full, params, returnExpr) => {
        // Skip if it uses `this` or `arguments`
        if (full.includes('this.') || full.includes('arguments')) return full;
        const result = `(${params}) => ${returnExpr}`;
        changes.push({
          from: full.substring(0, 50) + '...',
          to: result.substring(0, 50) + '...',
          description: 'Converted function expression to arrow function',
        });
        return result;
      });

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },

  // ============ REACT ============
  {
    id: 'deprecated-lifecycle',
    name: 'Replace deprecated React lifecycle methods',
    description: 'Replaces componentWillMount with componentDidMount',
    category: 'react',
    extensions: ['.js', '.jsx', '.tsx'],
    priority: 'high',
    transform(content) {
      const changes = [];
      let newContent = content;

      if (content.includes('componentWillMount')) {
        newContent = newContent.replace(/componentWillMount/g, 'componentDidMount');
        changes.push({
          from: 'componentWillMount',
          to: 'componentDidMount',
          description: 'Replaced deprecated componentWillMount with componentDidMount',
        });
      }

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },

  // ============ PYTHON ============
  {
    id: 'python2-print-to-function',
    name: 'Convert Python 2 print to print()',
    description: 'Converts Python 2 `print x` statements to `print(x)` function calls',
    category: 'python',
    extensions: ['.py'],
    priority: 'high',
    transform(content) {
      const changes = [];
      const lines = content.split('\n');
      const newLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s*)print\s+(.+)$/);
        if (match && !line.trim().startsWith('#') && !line.includes('print(')) {
          const [, indent, args] = match;
          const newLine = `${indent}print(${args})`;
          newLines.push(newLine);
          changes.push({
            line: i + 1,
            from: line.trim(),
            to: newLine.trim(),
            description: 'Converted Python 2 print statement to print() function',
          });
        } else {
          newLines.push(line);
        }
      }

      return {
        transformed: changes.length > 0,
        content: newLines.join('\n'),
        changes,
      };
    },
  },
  {
    id: 'python2-except-syntax',
    name: 'Fix Python 2 except syntax',
    description: 'Converts `except Exception, e` to `except Exception as e`',
    category: 'python',
    extensions: ['.py'],
    priority: 'high',
    transform(content) {
      const changes = [];
      let newContent = content;

      newContent = newContent.replace(
        /except\s+(\w+)\s*,\s*(\w+)/g,
        (full, excType, varName) => {
          changes.push({
            from: full,
            to: `except ${excType} as ${varName}`,
            description: `Fixed Python 2 except syntax`,
          });
          return `except ${excType} as ${varName}`;
        }
      );

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },

  // ============ HTML ============
  {
    id: 'html-doctype',
    name: 'Update HTML doctype',
    description: 'Ensures HTML5 doctype is present',
    category: 'html',
    extensions: ['.html', '.htm'],
    priority: 'low',
    transform(content) {
      const changes = [];
      let newContent = content;

      // Replace old doctypes with HTML5
      const oldDoctype = /<!DOCTYPE\s+HTML\s+PUBLIC[^>]*>/i;
      if (oldDoctype.test(newContent)) {
        newContent = newContent.replace(oldDoctype, '<!DOCTYPE html>');
        changes.push({
          from: 'Old DOCTYPE',
          to: '<!DOCTYPE html>',
          description: 'Updated to HTML5 doctype',
        });
      }

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },

  // ============ CSS ============
  {
    id: 'css-rgba-to-modern',
    name: 'Modernize CSS color functions',
    description: 'Converts old rgba() syntax to modern format',
    category: 'css',
    extensions: ['.css', '.scss'],
    priority: 'low',
    transform(content) {
      const changes = [];
      let newContent = content;

      // rgba(r, g, b, a) → rgb(r g b / a)
      // Keep this conservative — only transform simple cases
      const rgbaRegex = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g;
      newContent = newContent.replace(rgbaRegex, (full, r, g, b, a) => {
        const result = `rgb(${r} ${g} ${b} / ${a})`;
        changes.push({
          from: full,
          to: result,
          description: 'Modernized rgba() to modern CSS color syntax',
        });
        return result;
      });

      return { transformed: changes.length > 0, content: newContent, changes };
    },
  },
];

/**
 * Apply all applicable rule-based transformations to a project.
 * @param {string} projectDir - Path to the project directory (will be modified in-place).
 * @param {object} analysisResults - Results from the analyzer agent.
 * @returns {object} Transformation results.
 */
export async function applyRuleTransformations(projectDir, analysisResults) {
  logger.info('Agent 6: Starting rule-based transformations', { projectDir });

  const files = getAllFiles(projectDir);
  const results = {
    totalFiles: 0,
    totalChanges: 0,
    transformations: [],
    errors: [],
  };

  for (const file of files) {
    if (file.isBinary) continue;

    const applicableRules = TRANSFORM_RULES.filter((r) => r.extensions.includes(file.ext));
    if (applicableRules.length === 0) continue;

    let content = readFileContent(file.fullPath);
    if (!content) continue;

    let fileChanged = false;
    const fileChanges = [];

    for (const rule of applicableRules) {
      try {
        const result = rule.transform(content, file.path);
        if (result.transformed) {
          content = result.content;
          fileChanged = true;
          fileChanges.push({
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
            changes: result.changes,
          });
          results.totalChanges += result.changes.length;
        }
      } catch (err) {
        results.errors.push({
          file: file.path,
          rule: rule.id,
          error: err.message,
        });
        logger.warn('Agent 6: Rule transformation failed', {
          file: file.path,
          rule: rule.id,
          error: err.message,
        });
      }
    }

    if (fileChanged) {
      writeFileContent(file.fullPath, content);
      results.totalFiles++;
      results.transformations.push({
        file: file.path,
        changes: fileChanges,
      });
    }
  }

  logger.info('Agent 6: Rule transformations complete', {
    files: results.totalFiles,
    changes: results.totalChanges,
  });

  return results;
}

/**
 * Get available rules for a given file type.
 */
export function getAvailableRules(ext) {
  return TRANSFORM_RULES.filter((r) => r.extensions.includes(ext)).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    priority: r.priority,
  }));
}

export default { applyRuleTransformations, getAvailableRules };
