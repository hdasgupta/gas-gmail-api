// clasp create may overwrite src/appsscript.json with defaults and place .clasp.json
// Restore our manifest from the backup and ensure rootDir is "src".
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const claspPath = path.join(root, '.clasp.json');
const backup = path.join(root, 'scripts', 'appsscript.backup.json');
const manifest = path.join(root, 'src', 'appsscript.json');

if (fs.existsSync(claspPath)) {
  const cfg = JSON.parse(fs.readFileSync(claspPath, 'utf8'));
  cfg.rootDir = 'src';
  fs.writeFileSync(claspPath, JSON.stringify(cfg, null, 2) + '\n');
  console.log('.clasp.json scriptId:', cfg.scriptId);
}
if (fs.existsSync(backup)) {
  fs.copyFileSync(backup, manifest);
  console.log('Restored src/appsscript.json');
}
