function assertOutputTokenLimit(maxOutputTokens) {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) {
    throw new TypeError("Output-token limit must be a positive integer");
  }
  return maxOutputTokens;
}

function getOpenAIOutputOptions(maxOutputTokens) {
  return { max_tokens: assertOutputTokenLimit(maxOutputTokens) };
}

function getGeminiOutputOptions(maxOutputTokens, model = "") {
  const options = { maxOutputTokens: assertOutputTokenLimit(maxOutputTokens) };
  const normalizedModel = String(model).replace(/^models\//, "");
  const isGemini25Flash = /^gemini-2\.5-flash(?:-preview.*)?$/i.test(normalizedModel);
  if (isGemini25Flash) {
    options.thinkingConfig = {
      thinkingBudget: maxOutputTokens <= 768 ? 0 : Math.min(512, Math.floor(maxOutputTokens / 4)),
    };
  }
  return options;
}

function getOllamaOutputOptions(maxOutputTokens) {
  return { num_predict: assertOutputTokenLimit(maxOutputTokens) };
}

function getAzureOutputTokenLimit(maxOutputTokens, modelMaxTokens) {
  return Math.min(
    assertOutputTokenLimit(maxOutputTokens),
    assertOutputTokenLimit(modelMaxTokens),
  );
}

module.exports = {
  assertOutputTokenLimit,
  getOpenAIOutputOptions,
  getGeminiOutputOptions,
  getOllamaOutputOptions,
  getAzureOutputTokenLimit,
};
