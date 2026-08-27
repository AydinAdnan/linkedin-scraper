// Runs LinkedIn requests one at a time with a randomized gap between them.
// ponytail: global single-lane queue, not per-account — fine at our scale,
// upgrade to per-account queues if this ever handles multiple LinkedIn accounts.
let chain = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function enqueue(task) {
  const result = chain.then(async () => {
    await delay(1500 + Math.random() * 2000);
    return task();
  });
  chain = result.catch(() => {});
  return result;
}
