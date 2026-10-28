// Apply explicit fixture data through an artifact-owned preview adapter.
// This is an intervention, not a semantic evaluator or a production API client.
export function validateScenario(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('scenario must be an object');
  for (const key of Object.keys(value)) if (!['version', 'apply', 'input', 'timeoutMs'].includes(key)) throw new Error(`scenario: unknown field ${key}`);
  if (value.version !== 1) throw new Error('scenario.version must be 1');
  if (typeof value.apply !== 'string' || value.apply.length > 128 || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(value.apply)) throw new Error('scenario.apply must be a global function path');
  if (value.apply.split('.').some(p => ['__proto__', 'prototype', 'constructor'].includes(p))) throw new Error('scenario.apply cannot traverse a prototype');
  if (!Object.hasOwn(value, 'input')) throw new Error('scenario.input is required');
  if (value.timeoutMs !== undefined && (!Number.isInteger(value.timeoutMs) || value.timeoutMs < 1 || value.timeoutMs > 15000)) throw new Error('scenario.timeoutMs must be 1..15000');
  return value;
}

// Serialized into Chromium; no module dependencies. Resolve only own data
// properties so a path does not invoke accessors or inherit an unrelated method.
export async function applyInPage(scenario) {
  const parts = scenario.apply.split('.');
  let owner = globalThis;
  for (const part of parts.slice(0, -1)) {
    const descriptor = owner != null && Object.getOwnPropertyDescriptor(owner, part);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.value == null) throw new Error(`scenario adapter namespace is unavailable: ${part}`);
    owner = descriptor.value;
  }
  const descriptor = owner != null && Object.getOwnPropertyDescriptor(owner, parts.at(-1));
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') throw new Error(`scenario adapter is unavailable: ${scenario.apply}`);
  if (/\{\s*\[native code\]\s*\}$/.test(Function.prototype.toString.call(descriptor.value))) throw new Error('scenario adapter must be an artifact-defined JavaScript function, not a native or bound function');
  await descriptor.value.call(owner, scenario.input);
  return { applied: true };
}

export async function applyScenario(send, scenario) {
  validateScenario(scenario);
  const timeoutMs = scenario.timeoutMs ?? 5000, start = Date.now();
  let timer;
  try {
    // Parse JSON as data: an input property named __proto__ must not become an
    // object-literal prototype. No strings from the fixture become source code.
    const expression = `(${applyInPage.toString()})(JSON.parse(${JSON.stringify(JSON.stringify(scenario))}))`;
    const result = await Promise.race([
      send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`scenario application timed out after ${timeoutMs} ms`)), timeoutMs); }),
    ]);
    const elapsedMs = Date.now() - start;
    if (elapsedMs >= timeoutMs) throw new Error(`scenario application exceeded ${timeoutMs} ms`);
    if (result.exceptionDetails) throw new Error(`scenario application failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
    if (result.result?.value?.applied !== true) throw new Error('scenario application did not complete');
    return { applied: true, elapsedMs, timeoutMs };
  } finally { clearTimeout(timer); }
}
