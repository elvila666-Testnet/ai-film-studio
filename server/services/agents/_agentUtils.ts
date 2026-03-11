/**
 * Shared utilities for all Cinema Pipeline agents.
 * Centralizes JSON parsing to prevent "Failed to parse X Agent JSON" crashes.
 */

/**
 * Strips markdown code fences from LLM output before parsing.
 * Gemini sometimes wraps JSON in ```json ... ``` even when json_object mode is requested.
 */
export function stripMarkdownFences(raw: string): string {
    return raw
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim();
}

/**
 * Robust JSON extractor: strips fences, finds the first JSON object or array block.
 * Returns null if no valid JSON is found.
 */
function extractJSON(raw: string): string | null {
    const stripped = stripMarkdownFences(raw);

    // If it already looks like clean JSON, return it
    if (stripped.startsWith("{") || stripped.startsWith("[")) {
        return stripped;
    }

    // Try to find the first JSON object in the string
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    if (objMatch) return objMatch[0];

    // Try to find a JSON array
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    if (arrMatch) return arrMatch[0];

    return null;
}

/**
 * Safely parses LLM output as JSON.
 * @param rawContent - The raw content from LLM response (string or object)
 * @param agentName  - Name used for structured error messages
 * @param fallback   - A default value to return if parsing fails (prevents pipeline crash)
 * @returns The parsed object or the fallback value
 */
export function parseAgentJSON<T>(
    rawContent: string | object | null | undefined,
    agentName: string,
    fallback: T
): T {
    if (!rawContent) {
        console.warn(`[${agentName}] No content returned from LLM. Returning fallback.`);
        return fallback;
    }

    // If it's already an object (Gemini native path may return parsed JSON), return directly
    if (typeof rawContent === "object" && rawContent !== null) {
        return rawContent as T;
    }

    const rawStr = String(rawContent);
    const jsonStr = extractJSON(rawStr);

    if (!jsonStr) {
        console.error(`[${agentName}] FAILED TO EXTRACT JSON. Content preview: ${rawStr.substring(0, 300)}...`);
        return fallback;
    }

    try {
        // Double-check for partial markdown within the extracted block
        const cleanJsonStr = stripMarkdownFences(jsonStr);
        return JSON.parse(cleanJsonStr) as T;
    } catch (err) {
        console.error(`[${agentName}] JSON.parse FAILED. JSON snippet: ${jsonStr.substring(0, 300)}...`);
        return fallback;
    }
}
