import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

const TEMP_DIR = path.join(process.cwd(), "temp");
const CHUNKS_DIR = path.join(TEMP_DIR, "chunks");

function ensureDirs() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

export function convertToMp3(inputPath: string): Promise<string> {
  ensureDirs();
  const outputPath = path.join(TEMP_DIR, "audio.mp3");

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .on("end", () => resolve(outputPath))
      .on("error", (err: Error) => reject(err))
      .save(outputPath);
  });
}

export function getDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

export function chunkAudio(audioPath: string): Promise<string[]> {
  ensureDirs();
  // Clear old chunks
  if (fs.existsSync(CHUNKS_DIR)) {
    for (const file of fs.readdirSync(CHUNKS_DIR)) {
      fs.unlinkSync(path.join(CHUNKS_DIR, file));
    }
  }

  const outputPattern = path.join(CHUNKS_DIR, "chunk_%03d.mp3");

  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(["-f", "segment", "-segment_time", "600", "-c", "copy"])
      .on("end", () => {
        const chunks = fs
          .readdirSync(CHUNKS_DIR)
          .filter((f) => f.endsWith(".mp3"))
          .sort()
          .map((f) => path.join(CHUNKS_DIR, f));
        resolve(chunks);
      })
      .on("error", (err: Error) => reject(err))
      .output(outputPattern)
      .run();
  });
}

export function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}
