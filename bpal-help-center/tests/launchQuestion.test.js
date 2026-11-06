const test = require('node:test');
const assert = require('node:assert/strict');
const { extractLaunchQuestion } = require('../launchQuestion');

test('normal launch leaves all legacy arguments untouched', () => {
  const original = ['BPAL.exe', '-db:CDCMTL', '-fr', '-coordinates:100,200'];
  assert.deepEqual(extractLaunchQuestion(original), { question: null, legacyArgs: original });
});
test('quoted question and legacy arguments remain separate', () => {
  assert.deepEqual(extractLaunchQuestion(['BPAL.exe', '-db:CDCMTL', '--ask', 'What is BPAL?']),
    { question: 'What is BPAL?', legacyArgs: ['BPAL.exe', '-db:CDCMTL'] });
});
test('supports assignment syntax and preserves special characters', () => {
  assert.equal(extractLaunchQuestion(['BPAL.exe', '--ask=How do I sort a Folder?']).question,
    'How do I sort a Folder?');
});
test('does not use empty questions', () => {
  assert.equal(extractLaunchQuestion(['BPAL.exe', '--ask', '  ']).question, null);
});

// Regression: Electron/Chromium can inject a switch between --ask and its
// quoted value on a second-instance launch. This caused the app to ask the
// chatbot "--allow-file-access-from-files" instead of the real question.
test('ignores Chromium switch injected between --ask and the question', () => {
  assert.deepEqual(extractLaunchQuestion([
    'BPAL.exe', '--ask', '--allow-file-access-from-files', 'How do I sort a folder?'
  ]), {
    question: 'How do I sort a folder?',
    legacyArgs: ['BPAL.exe', '--allow-file-access-from-files']
  });
});
test('preserves original BPAL options even when Electron inserts runtime flags', () => {
  const argv = ['BPAL.exe', '-db:CDCMSMTL', '-fr', '--ask', '--no-sandbox',
    '--allow-file-access-from-files', 'What is BPAL?', '-coordinates:100,200'];
  assert.deepEqual(extractLaunchQuestion(argv), {
    question: 'What is BPAL?',
    legacyArgs: ['BPAL.exe', '-db:CDCMSMTL', '-fr', '--no-sandbox',
      '--allow-file-access-from-files', '-coordinates:100,200']
  });
});
test('never sends an Electron flag as a question if no question is supplied', () => {
  assert.deepEqual(extractLaunchQuestion(['BPAL.exe', '--ask', '--allow-file-access-from-files']), {
    question: null,
    legacyArgs: ['BPAL.exe', '--allow-file-access-from-files']
  });
});
test('preserves quoted legacy -data values containing spaces', () => {
  const argv = ['BPAL.exe', '-data:{"userName":"Test User"}', '--ask', 'Explain folders'];
  assert.deepEqual(extractLaunchQuestion(argv), {
    question: 'Explain folders',
    legacyArgs: ['BPAL.exe', '-data:{"userName":"Test User"}']
  });
});
test('supports second-instance with an interleaved option and its value', () => {
  const argv = ['BPAL.exe', '--ask', '-db', 'CDCMSMTL', 'What is BPAL?'];
  assert.deepEqual(extractLaunchQuestion(argv), {
    question: 'What is BPAL?',
    legacyArgs: ['BPAL.exe', '-db', 'CDCMSMTL']
  });
});
