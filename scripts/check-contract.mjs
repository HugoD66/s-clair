import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const files = ['contracts/openapi.json', 'apps/web/src/app/api-types.ts'];
const before = await Promise.all(files.map((file) => readFile(file, 'utf8')));
execFileSync('pnpm', ['contract:generate'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: 'postgresql://unused:unused@localhost/unused' },
});
for (const [index, file] of files.entries()) {
  if ((await readFile(file, 'utf8')) !== before[index]) {
    throw new Error(
      `Generated contract is out of date: ${file}. Review and commit the generated changes.`,
    );
  }
}
