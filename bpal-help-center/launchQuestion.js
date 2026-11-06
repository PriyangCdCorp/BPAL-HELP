"use strict";

// The option parser deliberately understands only the optional --ask parameter.
// All unrelated BPAL/Electron switches are preserved for the existing parser.
// On Windows Electron may insert Chromium switches (e.g.
// --allow-file-access-from-files) into the second-instance command line.
// Never mistake one of those switches for the user's question.
const MAX_QUESTION_LENGTH = 4000;
const ASK_OPTIONS = new Set(['--ask', '--ask-question']);

function isSwitch(value) {
  return /^(?:--(?:[a-z][\w-]*)(?:=.*)?|-(?:[a-z][\w-]*)(?::.*)?|\/(?:fr|en|query|db|d|data|coordinates)(?::.*)?)$/i.test(value);
}

function switchHasSeparateValue(value) {
  return /^(?:-db|-data|-d|-coordinates|\/db|\/data|\/d|\/coordinates|--inspect|--remote-debugging-port|--user-data-dir)$/i.test(value);
}

function extractLaunchQuestion(argv = []) {
  const args = Array.isArray(argv) ? argv.map(item => String(item ?? '')) : [];
  const omit = new Set();
  let question = null;

  for (let i = 0; i < args.length; i++) {
    const value = args[i];
    const lower = value.toLowerCase();

    if (ASK_OPTIONS.has(lower)) {
      omit.add(i);
      let candidate = i + 1;

      // Skip Chromium switches that Electron may have injected between
      // `--ask` and the quoted question. Do not drop these from legacyArgs.
      while (candidate < args.length && isSwitch(args[candidate])) {
        if (ASK_OPTIONS.has(args[candidate].toLowerCase())) break;
        if (switchHasSeparateValue(args[candidate]) && candidate + 1 < args.length) {
          candidate += 2;
        } else {
          candidate++;
        }
      }

      if (candidate < args.length && !isSwitch(args[candidate])) {
        const text = args[candidate].trim();
        if (text && text !== '.' && text !== '..') {
          question = text.slice(0, MAX_QUESTION_LENGTH);
          omit.add(candidate);
        }
      }
    } else if (lower.startsWith('--ask=') || lower.startsWith('--ask-question=')) {
      omit.add(i);
      const text = value.substring(value.indexOf('=') + 1).trim();
      if (text) question = text.slice(0, MAX_QUESTION_LENGTH);
    }
  }

  return { question, legacyArgs: args.filter((_, index) => !omit.has(index)) };
}

module.exports = { extractLaunchQuestion };
