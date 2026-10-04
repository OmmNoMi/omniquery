#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

console.log('===========================================================');
console.log('   OmniQuery Automated Mutation Testing Framework (TDD++) ');
console.log('===========================================================\n');

const omniqueryDir = path.resolve(__dirname, '..');
const benchDir = path.resolve(omniqueryDir, '..', '..');
const sitesDir = path.resolve(benchDir, 'sites');

const syncPyPath = path.resolve(omniqueryDir, 'omniquery', 'api', 'sync.py');
const fSwitchPath = path.resolve(omniqueryDir, 'src', 'components', 'common', 'FSwitch.vue');
const questionCardPath = path.resolve(omniqueryDir, 'src', 'components', 'survey', 'QuestionCard.vue');
const useWalPath = path.resolve(omniqueryDir, 'src', 'composables', 'useWAL.js');

let totalMutants = 0;
let killedMutants = 0;
let survivingMutants = 0;

function runMutationTest(name, fileToMutate, mutator, testCmd, cwd = omniqueryDir) {
  totalMutants++;
  console.log(`[Mutant #${totalMutants}] Testing: ${name}`);
  const originalContent = fs.readFileSync(fileToMutate, 'utf8');

  try {
    // 1. Inoculate / apply mutation
    const mutatedContent = mutator(originalContent);
    if (mutatedContent === originalContent) {
      throw new Error(`Mutator failed to change content for: ${name}`);
    }
    fs.writeFileSync(fileToMutate, mutatedContent, 'utf8');

    // 2. Run the test command
    let testPassed = false;
    let testOutput = '';
    try {
      testOutput = execSync(testCmd, { cwd, stdio: 'pipe' }).toString();
      testPassed = true;
    } catch (err) {
      testPassed = false;
      testOutput = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
    }

    // 3. Evaluate mutation result
    if (testPassed) {
      console.error(`  ❌ SURVIVED: The test suite passed despite the intentional mutation!`);
      survivingMutants++;
    } else {
      console.log(`  🎯 KILLED: Test turned RED as expected and caught the regression.`);
      killedMutants++;
    }
  } finally {
    // 4. Always restore original content cleanly
    fs.writeFileSync(fileToMutate, originalContent, 'utf8');
  }
}

// Mutant 1: Invert duplicate skip logic in batch_push (Backend Idempotency Gate)
runMutationTest(
  'Duplicate submission check inverted in batch_push (Gate 1 Security / Idempotency)',
  syncPyPath,
  (code) => code.replace(
    'if existing_status in ["Submitted", "Supervisor Verified", "Audit Flagged", "Approved"]:',
    'if False and existing_status in ["Submitted", "Supervisor Verified", "Audit Flagged", "Approved"]:'
  ),
  'bench --site ommnomi.local run-tests --module omniquery.tests.test_idempotent_sync',
  sitesDir
);

// Mutant 2: Bypass Guest authorization in upload_response_audio (Gate 1 Security IDOR)
runMutationTest(
  'Guest permission check bypassed in upload_response_audio (Gate 1 Security IDOR)',
  syncPyPath,
  (code) => code.replace(
    'if current_user == "Guest":',
    'if False and current_user == "Guest":'
  ),
  'bench --site ommnomi.local run-tests --module omniquery.tests.test_security_gates',
  sitesDir
);

// Mutant 3: Remove role="switch" from FSwitch (Gate 2 Accessibility WCAG 2.2 AA)
runMutationTest(
  'role="switch" removed from FSwitch.vue (Gate 2 Accessibility)',
  fSwitchPath,
  (code) => code.replace('role="switch"', 'role="generic-button"'),
  'npx vitest run src/components/__tests__/AccessibilityGates.spec.js',
  omniqueryDir
);

// Mutant 4: Remove :for binding from QuestionCard label (Gate 2 Accessibility WCAG 2.2 AA)
runMutationTest(
  ':for programmatic label association stripped in QuestionCard.vue (Gate 2 Accessibility)',
  questionCardPath,
  (code) => code.replace(":for=\"'q_input_' + question.question_code\"", ""),
  'npx vitest run src/components/__tests__/AccessibilityGates.spec.js',
  omniqueryDir
);

// Mutant 5: Invert Dexie WAL persistence in queueWAL (Gate 3 Offline Reliability)
runMutationTest(
  'IndexedDB WAL write omitted in queueWAL (Offline WAL Gate)',
  useWalPath,
  (code) => code.replace('await db.wal.add(walEntry);', '/* omitted */'),
  'npx vitest run src/composables/__tests__/useWAL.spec.js',
  omniqueryDir
);

// Summary Report
console.log('\n===========================================================');
console.log(` Mutation Testing Summary:`);
console.log(`   Total Mutants Tested: ${totalMutants}`);
console.log(`   Killed Mutants (Caught): ${killedMutants}`);
console.log(`   Surviving Mutants (Missed): ${survivingMutants}`);
const mutationScore = Math.round((killedMutants / totalMutants) * 100);
console.log(`   Mutation Detection Score: ${mutationScore}%`);
console.log('===========================================================\n');

if (survivingMutants > 0) {
  console.error(`FAIL: ${survivingMutants} mutant(s) survived! Harden the test suite.\n`);
  process.exit(1);
} else {
  console.log(`SUCCESS: 100% Mutation Score achieved! All critical quality gates are active.\n`);
  process.exit(0);
}
