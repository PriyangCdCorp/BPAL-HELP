
"use strict";

const { safeCmsUrl } = require("./cmsHelpContent");

function apiConfig({ env = {}, registryUrl, registryKey } = {}) {
  const rawUrl = String(
    env.HELPASSISTANT_API_URL || registryUrl || ""
  ).trim();

  const url = safeCmsUrl(rawUrl);

  const key = String(
    env.HELPASSISTANT_API_KEY || registryKey || ""
  ).trim();

  const realKey =
    !!key && !/^(REPLACE_|YOUR_|CHANGEME)/i.test(key);

  return {
    apiUrl: url,
    apiKey: realKey ? key : "",
    configured: !!url && realKey,
    reason: !url
      ? "HELPASSISTANT_API_URL is missing or invalid."
      : !realKey
        ? "HELPASSISTANT_API_KEY (customer key) is missing."
        : ""
  };
}

// Resolve endpoints from the API origin, regardless of whether
// the configured URL ends in /chat or is the base URL.
function endpointUrl(config, endpoint) {
  const base = new URL(config.apiUrl);
  if (base.protocol !== "https:" &&
      !(base.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(base.hostname))) {
    throw new Error("API connection requires HTTPS");
  }
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new Error("Invalid API endpoint");
  }
  return new URL(endpoint, base.origin).toString();
}

async function request(
  config,
  endpoint,
  {
    method = "GET",
    body,
    timeoutMs = 60000,
    fetchImpl = global.fetch
  } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetchImpl(
      endpointUrl(config, endpoint),
      {
        method,
        redirect: "error",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
          ...(body !== undefined
            ? { "Content-Type": "application/json" }
            : {})
        },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {})
      }
    );

    if (!response.ok) {
      let detail = "";

      try {
        const err = await response.json();
        if (typeof err.detail === "string") {
          detail = `: ${err.detail}`;
        }
      } catch {}

      throw new Error(
        `FastAPI ${endpoint} returned HTTP ${response.status}${detail}`
      );
    }

    return response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`FastAPI ${endpoint} timed out`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function checkApi(config, opts = {}) {
  try {
    if (!config.configured) {
      return {
        ok: false,
        error: config.reason
      };
    }

    // 1. Verify public server availability.
    const health = await request(
      config,
      "/health",
      { ...opts, timeoutMs: 8000 }
    );

    if (!health || health.status !== "ok") {
      throw new Error("FastAPI health check failed");
    }

    // 2. Verify the customer API key with a real chat request.
    // This also checks that the public /chat route works.
    const chat = await request(
      config,
      "/chat",
      {
        ...opts,
        method: "POST",
        body: {
          question: "Hello",
          conversation_id: null
        },
        timeoutMs: 90000
      }
    );

    if (!chat || typeof chat.answer !== "string") {
      throw new Error("FastAPI chat returned an invalid response");
    }

    return {
      ok: true,
      health,
      authenticated: true
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function askApi(
  config,
  { question, conversation_id = null, history = [] },
  opts = {}
) {
  if (!config.configured) {
    throw new Error(config.reason);
  }

  if (typeof question !== "string" || !question.trim()) {
    throw new Error("Question cannot be empty");
  }

  const result = await request(
    config,
    "/chat",
    {
      method: "POST",
      body: {
        question: question.trim(),
        conversation_id,
        history: Array.isArray(history)
          ? history.slice(-12)
          : []
      },
      timeoutMs: 90000,
      ...opts
    }
  );

  if (
    !result ||
    typeof result.answer !== "string" ||
    !result.conversation_id
  ) {
    throw new Error(
      "FastAPI /chat returned an unexpected response"
    );
  }

  return result;
}

module.exports = {
  apiConfig,
  checkApi,
  askApi
};
