const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getOpenAIOutputOptions,
  getGeminiOutputOptions,
  getOllamaOutputOptions,
  getAzureOutputTokenLimit,
} = require("../js/provider-output-options");

test("maps a profile limit to each provider option", () => {
  assert.deepEqual(getOpenAIOutputOptions(256), { max_tokens: 256 });
  assert.deepEqual(getGeminiOutputOptions(768), { maxOutputTokens: 768 });
  assert.deepEqual(getOllamaOutputOptions(2048), { num_predict: 2048 });
});

test("controls Gemini 2.5 Flash thinking within the selected budget", () => {
  assert.deepEqual(getGeminiOutputOptions(256, "gemini-2.5-flash"), {
    maxOutputTokens: 256,
    thinkingConfig: { thinkingBudget: 0 },
  });
  assert.deepEqual(getGeminiOutputOptions(2048, "models/gemini-2.5-flash"), {
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingBudget: 512 },
  });
  assert.deepEqual(getGeminiOutputOptions(256, "gemini-2.5-flash-lite"), {
    maxOutputTokens: 256,
  });
});

test("clamps Azure output to the model limit", () => {
  assert.equal(getAzureOutputTokenLimit(8192, 4096), 4096);
  assert.equal(getAzureOutputTokenLimit(256, 4096), 256);
});

test("rejects invalid provider output limits", () => {
  assert.throws(() => getOpenAIOutputOptions(0), /positive integer/);
  assert.throws(() => getGeminiOutputOptions(256.5), /positive integer/);
  assert.throws(() => getOllamaOutputOptions("256"), /positive integer/);
});
