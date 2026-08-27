// Runs LinkedIn requests one at a time with a randomized gap between them —
// a burst of evenly-spaced requests is itself a bot signal, so both the base
// delay and the jitter matter, not just avoiding zero delay.
// ponytail: global single-lane queue, not per-account — fine at our scale,
// upgrade to per-account queues if this ever handles multiple LinkedIn accounts.
import { config } from "../config.js";

let chain = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function enqueue(task) {
  const result = chain.then(async () => {
    await delay(config.requestDelayMs + Math.random() * config.requestDelayMs);
    return task();
  });
  chain = result.catch(() => {});
  return result;
}
