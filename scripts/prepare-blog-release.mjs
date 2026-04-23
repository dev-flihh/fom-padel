import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mode = process.argv[2] || 'preview';

const pipelines = {
  preview: [
    ['npm', ['run', 'blog:sync']],
    ['npm', ['run', 'blog:check']],
    ['npm', ['run', 'build']],
  ],
  final: [
    ['npm', ['run', 'blog:promote']],
    ['npm', ['run', 'blog:check']],
    ['npm', ['run', 'build']],
  ],
  'cutover-soft': [
    ['npm', ['run', 'blog:check']],
    ['npm', ['run', 'blog:cutover:on']],
    ['npm', ['run', 'build']],
  ],
  'cutover-permanent': [
    ['npm', ['run', 'blog:check']],
    ['npm', ['run', 'blog:cutover:permanent']],
    ['npm', ['run', 'build']],
  ],
  rollback: [
    ['npm', ['run', 'blog:cutover:off']],
    ['npm', ['run', 'build']],
  ],
};

function runStep(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  const steps = pipelines[mode];

  if (!steps) {
    throw new Error(
      `Unsupported mode: ${mode}. Use one of ${Object.keys(pipelines).join(', ')}`,
    );
  }

  console.log(`Preparing blog release in "${mode}" mode...\n`);

  for (const [command, args] of steps) {
    console.log(`> ${command} ${args.join(' ')}`);
    await runStep(command, args);
    console.log('');
  }

  console.log(`Blog release preparation completed for "${mode}" mode.`);
}

main().catch((error) => {
  console.error('Blog release preparation failed:', error.message);
  process.exitCode = 1;
});
