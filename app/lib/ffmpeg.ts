import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export function getDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

/**
 * Splits a video into ~10-minute MP4 segments using stream copy (no re-encoding).
 * Runs in seconds regardless of video length — just seeks and splits at keyframes.
 * Output files are valid MP4s that OpenAI transcription accepts directly.
 */
export function segmentVideo(inputPath: string): Promise<string[]> {
  const dir = path.dirname(inputPath);
  const chunksDir = path.join(dir, "chunks");
  fs.mkdirSync(chunksDir, { recursive: true });

  const outputPattern = path.join(chunksDir, "chunk_%03d.mp4");

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-f", "segment",
        "-segment_time", "600",
        "-c", "copy",         // no re-encoding — fast for any length
        "-reset_timestamps", "1",
        "-avoid_negative_ts", "1",
      ])
      .on("end", () => {
        const chunks = fs
          .readdirSync(chunksDir)
          .filter((f) => f.endsWith(".mp4"))
          .sort()
          .map((f) => path.join(chunksDir, f));
        resolve(chunks);
      })
      .on("error", (err: Error) => reject(err))
      .output(outputPattern)
      .run();
  });
}
