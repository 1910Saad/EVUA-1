import fs from 'fs';
import path from 'path';

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let oldContent = content;
  // Regex to replace db.XYZ() with await db.XYZ()
  // But make sure it's not already await db.XYZ()
  content = content.replace(/(?<!await\s)(db\.[a-zA-Z0-9_]+\()/g, 'await $1');
  
  if (content !== oldContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js')) {
      refactorFile(fullPath);
    }
  }
}

processDirectory(path.join(process.cwd(), 'routes'));
processDirectory(path.join(process.cwd(), 'pipeline'));
// wait! We don't want to replace inside components, etc.
console.log('Refactoring complete');
