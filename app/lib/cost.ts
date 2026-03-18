const RATE_PER_MINUTE = 0.006;
const SECONDS_PER_CHUNK_TRANSCRIBE = 30; // ~30s per 10-min chunk
const PARALLEL_CONCURRENCY = 5;
const CONVERSION_OVERHEAD_SECONDS = 20; // ffmpeg convert + chunk overhead

export function estimateCost(durationSeconds: number): {
  durationMinutes: number;
  estimatedCost: number;
  estimatedTimeSeconds: number;
} {
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const estimatedCost = parseFloat((durationMinutes * RATE_PER_MINUTE).toFixed(4));
  const totalChunks = Math.ceil(durationSeconds / 600);
  const batches = Math.ceil(totalChunks / PARALLEL_CONCURRENCY);
  const estimatedTimeSeconds =
    CONVERSION_OVERHEAD_SECONDS + batches * SECONDS_PER_CHUNK_TRANSCRIBE;
  return { durationMinutes, estimatedCost, estimatedTimeSeconds };
}
