// Keeps requests under the per-minute token allowance and never runs two at once
const WINDOW_MS = 60000;
const MAX_TOKENS = Number(process.env.GROQ_TOKENS_PER_MIN || 6000);

let spent = []; // [{ at, tokens }]
let queue = Promise.resolve();

const estimateTokens = (text) => Math.ceil(String(text).length / 4);

function tokensUsed() {
  const cutoff = Date.now() - WINDOW_MS;
  spent = spent.filter((s) => s.at > cutoff);
  return spent.reduce((sum, s) => sum + s.tokens, 0);
}

function record(tokens) {
  spent.push({ at: Date.now(), tokens });
}

/** Runs fn one at a time, waiting if the budget is nearly spent. */
function schedule(estimated, fn) {
  const run = async () => {
    const used = tokensUsed();
    if (used + estimated > MAX_TOKENS && spent.length) {
      const oldest = spent[0].at;
      const wait = Math.max(0, WINDOW_MS - (Date.now() - oldest)) + 250;
      console.log(`[budget] ${used}/${MAX_TOKENS} tokens used — waiting ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
    record(estimated);
    return fn();
  };
  queue = queue.then(run, run);
  return queue;
}

module.exports = { schedule, estimateTokens, tokensUsed };