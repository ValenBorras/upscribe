import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

export function convertToMp3(inputPath: string): Promise<string> {
  const dir = path.dirname(inputPath);
  const outputPath = path.join(dir, "audio.mp3");

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
  const dir = path.dirname(audioPath);
  const chunksDir = path.join(dir, "chunks");
  fs.mkdirSync(chunksDir, { recursive: true });

  const outputPattern = path.join(chunksDir, "chunk_%03d.mp3");

  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(["-f", "segment", "-segment_time", "600", "-c", "copy"])
      .on("end", () => {
        const chunks = fs
          .readdirSync(chunksDir)
          .filter((f) => f.endsWith(".mp3"))
          .sort()
          .map((f) => path.join(chunksDir, f));
        resolve(chunks);
      })
      .on("error", (err: Error) => reject(err))
      .output(outputPattern)
      .run();
  });
}
