import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(
  readFileSync(join(projectDir, 'package.json'), 'utf8'),
);
const lockfile = JSON.parse(
  readFileSync(join(projectDir, 'package-lock.json'), 'utf8'),
);

function installedVersion(packageName) {
  const packagePath = join(
    projectDir,
    'node_modules',
    ...packageName.split('/'),
    'package.json',
  );
  if (!existsSync(packagePath)) return null;
  return JSON.parse(readFileSync(packagePath, 'utf8')).version;
}

const expectedPrismaVersion = manifest.dependencies.prisma;
if (
  !/^\d+\.\d+\.\d+$/.test(expectedPrismaVersion) ||
  manifest.dependencies['@prisma/client'] !== expectedPrismaVersion
) {
  throw new Error('Prisma CLI and client must use the same exact version');
}

for (const packageName of ['prisma', '@prisma/client']) {
  const version = installedVersion(packageName);
  if (version !== expectedPrismaVersion) {
    throw new Error(
      `${packageName}: expected ${expectedPrismaVersion}, installed ${version ?? 'missing'}`,
    );
  }
}

for (const packageName of Object.keys(manifest.devDependencies ?? {})) {
  const lockEntry = lockfile.packages[`node_modules/${packageName}`];
  if (lockEntry?.dev === true && installedVersion(packageName) !== null) {
    throw new Error(
      `Development dependency present in runtime: ${packageName}`,
    );
  }
}

for (const packageName of ['jest', 'ts-jest', 'handlebars', '@nestjs/cli']) {
  if (installedVersion(packageName) !== null) {
    throw new Error(
      `Forbidden build/test package present in runtime: ${packageName}`,
    );
  }
}

const generatedClient = await import('@prisma/client');
if (
  typeof generatedClient.PrismaClient !== 'function' ||
  generatedClient.Role?.USER !== 'USER'
) {
  throw new Error('Generated Prisma Client is missing or invalid');
}

console.log(
  `Runtime dependency graph verified (Prisma ${expectedPrismaVersion})`,
);
