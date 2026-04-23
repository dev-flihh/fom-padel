import { copyFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const appShellHtml = path.join(distDir, 'archive.html');
const rootHtml = path.join(distDir, 'index.html');
const landingHtml = path.join(distDir, 'blog', 'index.html');

await copyFile(rootHtml, appShellHtml);
await copyFile(landingHtml, rootHtml);

console.log('Prepared hosting entrypoints: root=index.html (new landing), archive=archive.html (app shell).');
