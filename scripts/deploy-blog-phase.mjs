import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const phase = process.argv[2] || 'preview';
const shouldExecuteDeploy = process.argv.includes('--deploy');
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0996764238';

const phaseToPrepareScript = {
  preview: 'blog:prepare:preview',
  final: 'blog:prepare:final',
  'cutover-soft': 'blog:prepare:cutover-soft',
  'cutover-permanent': 'blog:prepare:cutover-permanent',
  rollback: 'blog:prepare:rollback',
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
  const prepareScript = phaseToPrepareScript[phase];

  if (!prepareScript) {
    throw new Error(
      `Unsupported phase: ${phase}. Use one of ${Object.keys(phaseToPrepareScript).join(', ')}`,
    );
  }

  console.log(`Preparing deploy flow for "${phase}"...\n`);
  await runStep('npm', ['run', prepareScript]);

  const deployArgs = ['firebase-tools', 'deploy', '--only', 'hosting', '--project', firebaseProjectId];
  const deployCommand = `npx ${deployArgs.join(' ')}`;

  console.log('\nNext deploy command:');
  console.log(deployCommand);

  if (!shouldExecuteDeploy) {
    console.log('\nDeploy not executed automatically. Re-run with --deploy to execute after preparation.');
    return;
  }

  console.log('\nExecuting deploy...\n');
  await runStep('npx', deployArgs);
}

main().catch((error) => {
  console.error('Blog deploy flow failed:', error.message);
  process.exitCode = 1;
});
