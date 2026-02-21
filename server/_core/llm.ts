import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  if (ENV.forgeApiKey?.startsWith("sk-")) {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (ENV.forgeApiKey?.startsWith("AIzaSy")) {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("AI API key (BUILT_IN_FORGE_API_KEY) is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

/**
 * Helper function for Google Gemini Native REST API
 */
async function invokeGeminiNative(apiKey: string, messages: Message[], model: string, params: InvokeParams): Promise<InvokeResult> {
  // Map models to available ones on this key
  let finalModel = model || "gemini-2.0-flash";
  if (finalModel === "gemini-1.5-pro") finalModel = "gemini-2.5-pro";
  if (finalModel === "gemini-1.5-flash") finalModel = "gemini-2.0-flash";

  // Ensure it at least sounds like a gemini model
  if (!finalModel.includes("gemini")) finalModel = "gemini-2.0-flash";

  const version = "v1beta";
  const baseUrl = `https://generativelanguage.googleapis.com/${version}/models/${finalModel}:generateContent`;
  const url = `${baseUrl}?key=${apiKey}`;

  console.log(`[LLM] Invoking Gemini Native REST API (${version}): ${finalModel}`);

  const contents = [];
  let systemInstruction = null;

  for (const msg of messages) {
    const contentText = Array.isArray(msg.content)
      ? msg.content.map(p => (typeof p === "string" ? p : p.type === "text" ? p.text : "")).join("")
      : typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: contentText }] };
    } else if (msg.role === "user" || msg.role === "assistant") {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: contentText }]
      });
    }
  }

  const body: any = { contents };
  if (systemInstruction) {
    body.system_instruction = systemInstruction;
  }

  // Handle Structured Output (JSON Schema)
  const responseFormat = params.responseFormat || params.response_format;
  const isJson = responseFormat?.type === "json_schema" ||
    responseFormat?.type === "json_object";

  if (isJson) {
    body.generationConfig = {
      response_mime_type: "application/json"
    };
  }

  console.log(`[LLM] Invoking Gemini Native REST API (${finalModel})...`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Gemini Native Error ${response.status}: ${error}`);
    throw new Error(`Gemini API Error ${response.status}: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    id: "gemini-" + Date.now(),
    created: Date.now(),
    model: finalModel,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: text,
      },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { getActiveModelConfig } = await import("../db");
  const activeConfig = await getActiveModelConfig("text");

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  // Resolve model, API key, and URL
  let apiKey = ENV.forgeApiKey;
  let apiUrl = resolveApiUrl();
  let modelName = params.model || "gemini-2.0-flash"; // Default

  if (activeConfig && !params.model) {
    modelName = activeConfig.modelId;
    if (activeConfig.apiKey) {
      apiKey = activeConfig.apiKey;
    }
    if (activeConfig.apiEndpoint) {
      apiUrl = activeConfig.apiEndpoint.includes("/v1/")
        ? activeConfig.apiEndpoint
        : `${activeConfig.apiEndpoint.replace(/\/$/, "")}/v1/chat/completions`;
    } else {
      // Re-resolve URL if API key changed but no endpoint
      if (apiKey?.startsWith("sk-")) apiUrl = "https://api.openai.com/v1/chat/completions";
      else if (apiKey?.startsWith("AIzaSy")) apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    }
  } else {
    // Check for explicit OpenAI key first (more reliable for production)
    if (ENV.openaiApiKey && ENV.openaiApiKey.startsWith("sk-")) {
      apiKey = ENV.openaiApiKey;
      apiUrl = "https://api.openai.com/v1/chat/completions";
      modelName = "gpt-4o";
    } else {
      assertApiKey();
      apiKey = ENV.forgeApiKey;
      modelName = "gemini-2.0-flash"; // Default built-in
    }
  }

  // CRITICAL: If this is a Gemini Key, ALWAYS use the Native REST endpoint.
  // The OpenAI-compatible endpoint from Google (v1beta/openai) is highly unreliable and frequently 404s.
  if (apiKey?.startsWith("AIzaSy")) {
    return await invokeGeminiNative(apiKey, messages, modelName, params);
  }

  const payload: Record<string, unknown> = {
    model: modelName,
    messages: messages.map(normalizeMessage),
  };

  console.log(`[LLM] Invoking ${modelName} at ${apiUrl}... (Key length: ${apiKey?.length})`);

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 8192;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`LLM API ERROR: ${JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: apiUrl,
      model: payload.model
    })}`);
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
