# Next.js Transcription App - Opus 4.6 Build Instructions

## Goal

Build a Next.js web app that allows a user to:

1. Upload a large .mp4 file (2–3 hours)
2. Convert video to .mp3 (ignore video)
3. Split audio into chunks (10 min each)
4. Transcribe each chunk using OpenAI API
5. Show real-time progress bar
6. Estimate and display cost before processing
7. Merge transcription
8. Download final .txt file

## Tech Stack

- Next.js 14 (App Router)
- Node.js backend (API routes)
- TypeScript
- Tailwind CSS
- OpenAI SDK
- ffmpeg (fluent-ffmpeg + ffmpeg-static)
- Zustand (optional)

## Install Dependencies

npm install openai fluent-ffmpeg ffmpeg-static formidable zustand

## Project Structure

app/
├── page.tsx
├── api/
│   ├── upload/route.ts
│   ├── process/route.ts
├── lib/
│   ├── ffmpeg.ts
│   ├── transcribe.ts
│   ├── cost.ts
│   ├── progress.ts
temp/
output/
.env

## Environment

OPENAI_API_KEY=your_key

## Backend Logic

### Convert MP4 to MP3

Use ffmpeg:

ffmpeg(inputPath)
  .noVideo()
  .audioCodec("libmp3lame")
  .audioBitrate("128k")
  .save(outputPath);

Save to: /temp/audio.mp3

### Chunk Audio

Split into 10-minute chunks:

ffmpeg(audioPath)
  .outputOptions([
    "-f segment",
    "-segment_time 600",
    "-c copy"
  ])
  .output("temp/chunks/chunk_%03d.mp3")

### Get Duration

ffmpeg.ffprobe(file, (err, metadata) => {
  const duration = metadata.format.duration;
});

### Cost Estimation

Rate: $0.006 per minute

cost = duration_minutes * 0.006

### Transcription

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

await openai.audio.transcriptions.create({
  file: fs.createReadStream(chunkPath),
  model: "gpt-4o-transcribe"
});

### Processing Pipeline

- Convert video
- Chunk audio
- Loop chunks:
  - Transcribe
  - Append text
  - Update progress

### Progress Tracking

Return:

{
  progress: number,
  status: string
}

Frontend polls every 1–2 seconds.

### Output

Save transcript to:

/output/transcript.txt

Provide download endpoint.

## Frontend

### UI Components

- File uploader
- Estimate cost button
- Start transcription button
- Progress bar
- Cost display
- Download button

### Progress Bar

<div className="w-full bg-gray-200 rounded">
  <div className="bg-green-500 h-4 rounded" style={{ width: `${progress}%` }} />
</div>

### Polling

setInterval(() => {
  fetch("/api/progress")
}, 1500);

## Important Considerations

### File Size

Use local storage in /temp for uploads.

### Performance

Process chunks sequentially to avoid rate limits.

### Cleanup

Delete temp files after processing.

## Final Flow

1. Upload mp4
2. Convert to mp3
3. Estimate duration and cost
4. Start transcription
5. Show progress
6. Generate txt file
7. Download transcript
