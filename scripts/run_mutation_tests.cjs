#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

console.log('===========================================================');
console.log('   OmniQuery Automated Mutation Testing Framework (TDD++) ');
console.log('===========================================================\n');

const omniqueryDir = path.resolve(__dirname, '..');

const fSwitchPath = path.resolve(omniqueryDir, 'src', 'components', 'common', 'FSwitch.vue');
const baseModalPath = path.resolve(omniqueryDir, 'src', 'components', 'common', 'BaseModal.vue');
const questionCardPath = path.resolve(omniqueryDir, 'src', 'components', 'survey', 'QuestionCard.vue');
const responseTitlePath = path.resolve(omniqueryDir, 'src', 'utils', 'responseTitle.js');
const useWalPath = path.resolve(omniqueryDir, 'src', 'composables', 'useWAL.js');
const thinShellHtmlPath = path.resolve(omniqueryDir, 'omniquery', 'www', 'omniquery.html');

let totalMutants = 0;
let totalKilled = 0;
const guardScores = {};

function runGuardMutationTest(guardName, mutantDescription, fileToMutate, mutator, testCmd) {
  totalMutants++;
  if (!guardScores[guardName]) {
    guardScores[guardName] = { total: 0, killed: 0 };
  }
  guardScores[guardName].total++;

  console.log(`[Guard: ${guardName}] Mutant #${totalMutants}: ${mutantDescription}`);
  const originalContent = fs.readFileSync(fileToMutate, 'utf8');

  try {
    // 1. Inoculate mutation
    const mutatedContent = mutator(originalContent);
    if (mutatedContent === originalContent) {
      throw new Error(`Mutator failed to change content for: ${mutantDescription}`);
    }
    fs.writeFileSync(fileToMutate, mutatedContent, 'utf8');

    // 2. Run the guard test
    let testPassed = false;
    try {
      execSync(testCmd, { cwd: omniqueryDir, stdio: 'pipe' });
      testPassed = true;
    } catch (err) {
      testPassed = false;
    }

    // 3. Evaluate: The guard MUST fail (testPassed === false) to kill the mutant
    if (testPassed) {
      console.error(`  ❌ SURVIVED: The guard test passed despite the intentional mutation!`);
    } else {
      console.log(`  🎯 KILLED: Guard turned RED as expected and caught the regression.`);
      totalKilled++;
      guardScores[guardName].killed++;
    }
  } finally {
    // 4. Always restore original content cleanly
    fs.writeFileSync(fileToMutate, originalContent, 'utf8');
  }
}

// 1. Guard: no-glyph
runGuardMutationTest(
  'no-glyph',
  'Insert unescaped glyph/emoji into FSwitch.vue',
  fSwitchPath,
  (code) => code.replace('cursor-pointer', 'cursor-pointer ⚡'),
  'npx vitest run test/guards/no_glyphs.test.js'
);

// 2. Guard: no-raw-control
runGuardMutationTest(
  'no-raw-control',
  'Insert raw <button> into FSwitch.vue',
  fSwitchPath,
  (code) => code.replace('<template>', '<template>\n  <button>Raw</button>'),
  'npx vitest run test/guards/no_raw_controls.test.js'
);

// 3. Guard: thin-shell
runGuardMutationTest(
  'thin-shell',
  'Pad omniquery.html with 20 dummy lines exceeding 40 lines limit',
  thinShellHtmlPath,
  (code) => code + '\n' + Array(20).fill('<!-- extra line to exceed limit -->').join('\n') + '\n',
  'npx vitest run test/guards/thin_shell.test.js'
);

// 4. Guard: single-useWAL
const projectHeaderCardPath = path.resolve(omniqueryDir, 'src', 'components', 'dashboard', 'ProjectHeaderCard.vue');
runGuardMutationTest(
  'single-useWAL',
  'Direct useWAL() invocation inside component breaking single-useWAL invariant',
  projectHeaderCardPath,
  (code) => code.replace('<script setup>', '<script setup>\nimport { useWAL } from "../../composables/useWAL";\nconst _w = useWAL();'),
  'npx vitest run test/guards/single_usewal.test.js'
);

// 5. Guard: escape-one-layer
runGuardMutationTest(
  'escape-one-layer',
  'Remove e.stopPropagation() from BaseModal.vue Escape handler',
  baseModalPath,
  (code) => code.replace('e.stopPropagation();', '/* omitted */'),
  'npx vitest run test/guards/escape_one_layer.test.js'
);

// 6. Guard: contrast
runGuardMutationTest(
  'contrast',
  'Add low-contrast text-slate-200 class on light background in FSwitch.vue',
  fSwitchPath,
  (code) => code.replace('text-slate-800', 'text-slate-200'),
  'npx vitest run test/guards/contrast.test.js'
);

// 7. Guard: no-undef
runGuardMutationTest(
  'no-undef',
  'Introduce undeclared undefinedGlobalVariable token in responseTitle.js',
  responseTitlePath,
  (code) => code + '\nconst _invalid = undefinedGlobalVariable;\n',
  'npx vitest run test/guards/no_undef.test.js'
);

// 8. Guard: accessibility (WCAG 2.2 AA)
runGuardMutationTest(
  'accessibility',
  'Remove role="switch" from FSwitch.vue',
  fSwitchPath,
  (code) => code.replace('role="switch"', 'role="generic-button"'),
  'npx vitest run src/components/__tests__/AccessibilityGates.spec.js'
);

// 9. Guard: offline-wal
runGuardMutationTest(
  'offline-wal',
  'Omit db.wal.add in queueWAL in useWAL.js',
  useWalPath,
  (code) => code.replace('await db.wal.add(walEntry);', '/* omitted */'),
  'npx vitest run src/composables/__tests__/useWAL.spec.js'
);

// Report per guard
console.log('\n===========================================================');
console.log(' Mutation Score by Guard:');
console.log('-----------------------------------------------------------');
for (const [guard, score] of Object.entries(guardScores)) {
  const pct = Math.round((score.killed / score.total) * 100);
  console.log(`  Guard [${guard.padEnd(16)}]: ${score.killed}/${score.total} killed (${pct}%)`);
}

console.log('-----------------------------------------------------------');
console.log(` Overall Mutation Testing Summary:`);
console.log(`   Total Mutants Tested: ${totalMutants}`);
console.log(`   Killed Mutants (Caught): ${totalKilled}`);
console.log(`   Surviving Mutants (Missed): ${totalMutants - totalKilled}`);
const overallScore = Math.round((totalKilled / totalMutants) * 100);
console.log(`   Overall Mutation Score: ${overallScore}%`);
console.log('===========================================================\n');

if (totalKilled < totalMutants) {
  console.error(`FAIL: ${totalMutants - totalKilled} mutant(s) survived! Harden the test suite.\n`);
  process.exit(1);
} else {
  console.log(`SUCCESS: 100% Mutation Score achieved across all design rule guards!\n`);
  process.exit(0);
}
