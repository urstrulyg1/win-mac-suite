/**
 * WinSuite & MacSuite v16.1 — Cross-platform bug-regression suite.
 *
 * Covers fixes that keep the application consistent on macOS and Windows:
 *   1. `classifyFailure` must emit platform-specific (not always macOS) copy.
 *   2. `expandWindowsEnvTokens` must resolve %SystemDrive%/SystemRoot/ProgramData
 *      so Windows commands are not hardcoded to the C: drive.
 *   3. The Windows allowlist must not hardcode `C:\` or literals that assume the
 *      system drive is C:.
 *
 * Run with: node server/tests/v11-platform-bugs.test.js
 */

import assert from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
}

function setPlatform(v) {
  Object.defineProperty(process, 'platform', { value: v, configurable: true, writable: true, enumerable: true });
}

const restorePlatform = process.platform;

async function run() {
  const { classifyFailure } = await import('../runtime/operation-executor.js');
  const { expandWindowsEnvTokens } = await import('../security/exec-guard.js');
  const { COMMAND_ALLOWLIST } = await import('../security/allowlist.js');

  await testAsync('classifyFailure reports a Windows-specific permission message on win32', () => {
    setPlatform('win32');
    const err = classifyFailure(new Error('EACCES: permission denied'));
    assert.match(err.userMessage, /Windows/);
    assert.doesNotMatch(err.userMessage, /macOS/i);
    assert.match(err.remediation, /Administrator/i);
  });

  await testAsync('classifyFailure reports a macOS-specific permission message on darwin', () => {
    setPlatform('darwin');
    const err = classifyFailure(new Error('EACCES: permission denied'));
    assert.match(err.userMessage, /macOS/);
    assert.doesNotMatch(err.userMessage, /Windows/i);
  });

  await testAsync('classifyFailure neutral copy for unsupported platform', () => {
    setPlatform('linux');
    const err = classifyFailure(new Error('ENOENT: no such file'));
    assert.match(err.userMessage, /binary or path/i);
  });

  await testAsync('classifyFailure MISSING_BINARY message references the right OS', () => {
    setPlatform('win32');
    const err = classifyFailure(new Error('ENOENT: no such file or directory'));
    assert.match(err.userMessage, /Windows binary or path/i);
  });

  await testAsync('expandWindowsEnvTokens resolves SystemDrive and SystemRoot', () => {
    const prevDrive = process.env.SystemDrive;
    const prevRoot = process.env.SystemRoot;
    process.env.SystemDrive = 'D:';
    process.env.SystemRoot = 'D:\\Windows';
    try {
      const args = expandWindowsEnvTokens(['%SystemDrive%\\', '/O']);
      assert.strictEqual(args[0], 'D:\\');
      assert.strictEqual(args[1], '/O');
    } finally {
      if (prevDrive === undefined) delete process.env.SystemDrive; else process.env.SystemDrive = prevDrive;
      if (prevRoot === undefined) delete process.env.SystemRoot; else process.env.SystemRoot = prevRoot;
    }
  });

  await testAsync('expandWindowsEnvTokens resolves nested ProgramData token', () => {
    const prevDrive = process.env.SystemDrive;
    process.env.SystemDrive = 'D:';
    try {
      const args = expandWindowsEnvTokens(['%ProgramData%\\Microsoft\\Search']);
      assert.strictEqual(args[0], 'D:\\ProgramData\\Microsoft\\Search');
    } finally {
      if (prevDrive === undefined) delete process.env.SystemDrive; else process.env.SystemDrive = prevDrive;
    }
  });

  await testAsync('expandWindowsEnvTokens leaves plain args untouched', () => {
    const args = expandWindowsEnvTokens(['-NoProfile', '/scannow', 'upgrade', '--all']);
    assert.deepStrictEqual(args, ['-NoProfile', '/scannow', 'upgrade', '--all']);
  });

  await testAsync('Windows allowlist has no hardcoded C:\\ literals', () => {
    const offenders = [];
    for (const [id, spec] of Object.entries(COMMAND_ALLOWLIST)) {
      if (spec.platform !== 'windows') continue;
      const joined = (spec.fixedArgs || []).join('\n');
      // A literal "C:" or "C:\" that is not part of the %SystemDrive% token is a
      // drive-letter assumption that breaks on non-C: systems.
      const bare = /(?<!SystemDrive%)(?<!%SystemDrive)\\bC:\\\\?[^"%]*/.exec(joined);
      if (bare) offenders.push({ id, match: bare[0] });
    }
    assert.deepStrictEqual(offenders, [], `hardcoded C: drive literals: ${JSON.stringify(offenders)}`);
  });

  await testAsync('defrag command targets the system drive, not C: hardcoded', () => {
    const spec = COMMAND_ALLOWLIST['win.defrag.trim'];
    assert.ok(spec);
    assert.ok(spec.fixedArgs[0].includes('%SystemDrive%'), `defrag should target %SystemDrive%, got: ${spec.fixedArgs[0]}`);
  });

  setPlatform(restorePlatform);

  console.log(`\n═══ platform-bugs results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exitCode = 1;
  return { passed, failed };
}

await run();
