/**
 * Brand Scraper Service
 * Fetches website content and uses LLM to extract Brand DNA
 */
import { invokeLLM } from "../_core/llm";

export async function scrapeBrandFromUrl(url: string): Promise<any> {
    try {
        // 1. Fetch the HTML content
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();

        // 2. Naive text extraction (remove scripts, styles, and tags)
        // This is a simple fallback since we don't have cheerio/jsdom
        const cleanText = html
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 15000); // Limit to 15k chars to avoid token limits

        // 3. Analyze with LLM
        const llmResponse = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: `You are a Brand Strategist. Analyze the provided website text and extract the Brand DNA.
          
          Return a JSON object with these fields:
          - name: The brand name
          - targetCustomer: Who they sell to
          - aesthetic: Visual style/vibe
          - mission: Valid mission statement or purpose
          - coreMessaging: Key slogans or value propositions
          - description: A brief summary
          
          If a field cannot be found, make a best guess or leave blank strings.`
                },
                {
                    role: "user",
                    content: `Website Content (${url}):\n\n${cleanText}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = llmResponse.choices[0]?.message.content;
        if (!content || typeof content !== 'string') throw new Error("Failed to analyze brand content");

        return JSON.parse(content);
    } catch (error) {
        console.error("Brand scraping failed:", error);
        throw new Error(`Failed to scrape brand: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
