import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeChunk(chunkPath: string): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(chunkPath),
    model: "gpt-4o-transcribe",
  });

  return response.text;
}

/**
 * Process chunks in parallel batches while preserving order.
 * Default concurrency of 5 is safe for all OpenAI tiers (Tier 1 = 500 RPM).
 */
export async function transcribeChunksParallel(
  chunks: string[],
  concurrency: number,
  onChunkComplete: (completedCount: number) => void,
): Promise<string[]> {
  const results: string[] = new Array(chunks.length);
  let completedCount = 0;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((chunk, batchIdx) =>
        transcribeChunk(chunk).then((text) => {
          results[i + batchIdx] = text;
          completedCount++;
          onChunkComplete(completedCount);
          return text;
        }),
      ),
    );
    // batch done, loop continues to next batch
  }

  return results;
}
