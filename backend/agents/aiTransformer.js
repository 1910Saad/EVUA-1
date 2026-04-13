import fs from 'fs';
import { getAllFiles, readFileContent, writeFileContent } from '../utils/fileUtils.js';
import config from '../config/index.js';
import logger from '../middleware/logger.js';

/**
 * Agent 7: AI-Based Transformer
 * Uses an AI model to intelligently upgrade complex parts of the code,
 * improve structure, and follow modern best practices.
 *
 * Falls back to built-in heuristic transforms if no AI API key is configured.
 */

const MAX_CONTENT_LENGTH = 8000; // Max characters to send to AI per file

// System prompt for AI-based code upgrades
const SYSTEM_PROMPT = `You are an expert code modernization assistant. Your task is to upgrade code to modern standards while preserving functionality.

Rules:
1. PRESERVE all existing functionality — the code must work the same after upgrade.
2. Apply modern best practices for the detected language/framework.
3. Only return the upgraded code, no explanations.
4. If the code is already modern, return it unchanged.
5. Keep all comments and documentation.
6. Maintain the same code style (indentation, naming conventions).`;

// AI upgrade prompts per language/framework
const UPGRADE_PROMPTS = {
  'react-class-to-hooks': `Convert this React class component to a functional component using hooks.
- Replace state with useState
- Replace lifecycle methods with useEffect
- Keep all props and functionality intact
- Preserve component name and exports`,

  'javascript-modernize': `Modernize this JavaScript code:
- Use const/let instead of var
- Use arrow functions where appropriate
- Use template literals
- Use destructuring
- Use spread/rest operators
- Use optional chaining and nullish coalescing
- Use modern array methods (map, filter, reduce)`,

  'python-modernize': `Modernize this Python code to Python 3 standards:
- Use f-strings instead of format() or %
- Use type hints
- Use pathlib for file operations
- Use modern exception handling
- Use with statements for context managers`,

  'general-upgrade': `Upgrade this code to modern standards:
- Use current language best practices
- Improve code structure and readability
- Remove deprecated patterns
- Add appropriate error handling`,
};

/**
 * Apply AI-based transformations to complex code patterns.
 * @param {string} projectDir - Path to the project directory (will be modified in-place).
 * @param {object} analysisResults - Results from the analyzer agent.
 * @returns {object} Transformation results.
 */
export async function applyAiTransformations(projectDir, analysisResults) {
  logger.info('Agent 7: Starting AI-based transformations', { projectDir });

  const results = {
    totalFiles: 0,
    totalChanges: 0,
    transformations: [],
    errors: [],
    mode: config.ai.apiKey ? 'ai' : 'heuristic',
  };

  // Identify files that need complex transformations (not handled by rule-based)
  const complexIssues = (analysisResults.issues || []).filter(
    (issue) => !issue.autoFixable && ['react', 'pattern'].includes(issue.category)
  );

  if (complexIssues.length === 0) {
    logger.info('Agent 7: No complex issues found — skipping AI transforms');
    return results;
  }

  // Group issues by file
  const fileIssues = {};
  for (const issue of complexIssues) {
    if (!fileIssues[issue.filePath]) {
      fileIssues[issue.filePath] = [];
    }
    fileIssues[issue.filePath].push(issue);
  }

  // Process each file with issues
  for (const [filePath, issues] of Object.entries(fileIssues)) {
    const fullPath = `${projectDir}/${filePath}`;
    const content = readFileContent(fullPath);
    if (!content) continue;

    try {
      let upgradedContent;
      const changeDescriptions = [];

      if (config.ai.apiKey) {
        // Use AI API for complex transformations
        upgradedContent = await transformWithAi(content, issues, filePath);
      } else {
        // Use heuristic fallback
        const heuristicResult = transformWithHeuristics(content, issues, filePath);
        upgradedContent = heuristicResult.content;
        changeDescriptions.push(...heuristicResult.changes);
      }

      if (upgradedContent && upgradedContent !== content) {
        writeFileContent(fullPath, upgradedContent);
        results.totalFiles++;
        results.totalChanges += changeDescriptions.length || 1;
        results.transformations.push({
          file: filePath,
          issues: issues.map((i) => i.name),
          mode: config.ai.apiKey ? 'ai' : 'heuristic',
          changes: changeDescriptions,
        });
      }
    } catch (err) {
      results.errors.push({
        file: filePath,
        error: err.message,
      });
      logger.warn('Agent 7: AI transformation failed', {
        file: filePath,
        error: err.message,
      });
    }
  }

  logger.info('Agent 7: AI transformations complete', {
    files: results.totalFiles,
    changes: results.totalChanges,
    mode: results.mode,
  });

  return results;
}

/**
 * Transform code using AI API.
 */
async function transformWithAi(content, issues, filePath) {
  const issueNames = issues.map((i) => i.name);
  let prompt = UPGRADE_PROMPTS['general-upgrade'];

  // Select specific prompt based on issues
  if (issueNames.some((n) => n.includes('react-class'))) {
    prompt = UPGRADE_PROMPTS['react-class-to-hooks'];
  } else if (issueNames.some((n) => n.includes('python'))) {
    prompt = UPGRADE_PROMPTS['python-modernize'];
  } else if (issueNames.some((n) => n.includes('callback') || n.includes('require'))) {
    prompt = UPGRADE_PROMPTS['javascript-modernize'];
  }

  const truncatedContent = content.length > MAX_CONTENT_LENGTH
    ? content.substring(0, MAX_CONTENT_LENGTH) + '\n// ... (truncated)'
    : content;

  try {
    const response = await fetch(config.ai.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${prompt}\n\nFile: ${filePath}\n\nCode:\n\`\`\`\n${truncatedContent}\n\`\`\``,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Extract code from markdown code blocks if present
    const codeMatch = aiContent.match(/```[\w]*\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1] : aiContent;
  } catch (err) {
    logger.warn('Agent 7: AI API call failed, falling back to heuristics', {
      error: err.message,
    });
    const result = transformWithHeuristics(content, issues, filePath);
    return result.content;
  }
}

/**
 * Heuristic fallback for when AI API is not available.
 * Handles common patterns with built-in logic.
 */
function transformWithHeuristics(content, issues, filePath) {
  let newContent = content;
  const changes = [];

  for (const issue of issues) {
    switch (issue.name) {
      case 'react-class-component': {
        // Basic class → functional component conversion
        const classMatch = newContent.match(
          /class\s+(\w+)\s+extends\s+(?:React\.)?Component\s*\{([\s\S]*)\}/
        );
        if (classMatch) {
          const [, componentName, classBody] = classMatch;

          // Extract render method
          const renderMatch = classBody.match(/render\s*\(\s*\)\s*\{([\s\S]*)\}\s*$/);
          if (renderMatch) {
            const renderBody = renderMatch[1].trim();

            // Build functional component
            let funcComponent = `const ${componentName} = (props) => {\n`;

            // Extract state from constructor
            const stateMatch = classBody.match(/this\.state\s*=\s*(\{[\s\S]*?\});/);
            if (stateMatch) {
              try {
                // Parse state object — simplified
                funcComponent += `  // TODO: Convert state to individual useState hooks\n`;
                funcComponent += `  // Original state: ${stateMatch[1].replace(/\n/g, ' ').substring(0, 100)}\n`;
              } catch {
                // Skip
              }
            }

            funcComponent += `  ${renderBody}\n`;
            funcComponent += `};\n`;

            // Only apply if render content looks reasonable
            if (renderBody.includes('return')) {
              newContent = newContent.replace(classMatch[0], funcComponent);
              changes.push({
                description: `Converted class component ${componentName} to functional component (manual review recommended)`,
                from: `class ${componentName} extends Component`,
                to: `const ${componentName} = (props) => { ... }`,
              });
            }
          }
        }
        break;
      }

      case 'callback-hell': {
        // Add a comment suggesting async/await refactoring
        if (!newContent.includes('// TODO: Refactor nested callbacks')) {
          const firstCallback = newContent.indexOf('function');
          if (firstCallback > -1) {
            newContent =
              '// TODO: Refactor nested callbacks to async/await pattern\n' + newContent;
            changes.push({
              description: 'Added refactoring suggestion comment for callback pattern',
            });
          }
        }
        break;
      }

      default:
        // For unknown issues, add a comment
        break;
    }
  }

  return { content: newContent, changes };
}

export default { applyAiTransformations };
