import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUMMARY_PROMPT_PATH = path.join(
  process.cwd(),
  "app",
  "lib",
  "summary-prompt.md",
);

type SummaryResult = {
  markdown: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Generate a comprehensive lecture summary using OpenAI Chat Completions.
 * Returns the summary markdown and token usage for cost tracking.
 */
export async function generateSummary(
  transcript: string,
): Promise<SummaryResult> {
  const systemPrompt = fs.readFileSync(SUMMARY_PROMPT_PATH, "utf-8");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the full lecture transcription. Generate a complete and comprehensive summary following your instructions.\n\n---\n\n${transcript}`,
      },
    ],
  });

  const markdown = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  return { markdown, inputTokens, outputTokens };
}
