import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const keys: string[] = [];
for (let i = 1; i <= 100; i++) {
  keys.push(String(i));
}
for (let charCode = 65; charCode <= 90; charCode++) {
  keys.push(String.fromCharCode(charCode));
}

function processGender(gender: 'male' | 'female', prefix: string) {
  const dir = path.join(process.cwd(), 'public', 'audio', gender);
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }

  const spriteMap: Record<string, [number, number]> = {};
  let currentSampleOffset = 0;
  const sampleRate = 24000;
  const silenceSamples = Math.round(sampleRate * 0.15); // 150ms clear silence gap
  const silenceBuffer = Buffer.alloc(silenceSamples * 2);

  const pcmChunks: Buffer[] = [];
  const validKeys: string[] = [];

  for (const key of keys) {
    const filename = `${prefix}_${key}.mp3`;
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      validKeys.push(key);
      const tempPcmPath = path.join(os.tmpdir(), `temp_${gender}_${key}.pcm`);
      try {
        const filterStr = 'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,areverse';
        const ffmpegExtract = `ffmpeg -y -i "${filePath}" -af "${filterStr}" -ar ${sampleRate} -ac 1 -f s16le "${tempPcmPath}"`;
        execSync(ffmpegExtract, { stdio: 'ignore' });

        const pcmBuf = fs.readFileSync(tempPcmPath);
        const sampleCount = pcmBuf.length / 2;
        const durationMs = (sampleCount / sampleRate) * 1000;
        const startMs = (currentSampleOffset / sampleRate) * 1000;

        const paddedDurationMs = Math.max(durationMs + 150, 400);

        spriteMap[key] = [Math.round(startMs), Math.round(paddedDurationMs)];

        pcmChunks.push(pcmBuf);
        pcmChunks.push(silenceBuffer);

        currentSampleOffset += sampleCount + silenceSamples;

        if (fs.existsSync(tempPcmPath)) {
          fs.unlinkSync(tempPcmPath);
        }
      } catch (e) {
        console.error(`Error processing ${filename}:`, e);
      }
    }
  }

  const masterPcm = Buffer.concat(pcmChunks);
  const masterPcmPath = path.join(os.tmpdir(), `master_${gender}.pcm`);
  fs.writeFileSync(masterPcmPath, masterPcm);

  const outputMp3 = path.join(process.cwd(), 'public', 'audio', `${gender}_sprite.mp3`);
  const outputJson = path.join(process.cwd(), 'public', 'audio', `${gender}_sprite.json`);

  const ffmpegMasterCmd = `ffmpeg -y -f s16le -ar ${sampleRate} -ac 1 -i "${masterPcmPath}" -c:a libmp3lame -b:a 192k "${outputMp3}"`;
  console.log(`Running: ${ffmpegMasterCmd}`);
  execSync(ffmpegMasterCmd);

  if (fs.existsSync(masterPcmPath)) {
    fs.unlinkSync(masterPcmPath);
  }

  fs.writeFileSync(outputJson, JSON.stringify(spriteMap, null, 2));
  console.log(`Successfully generated precise ${outputMp3} and ${outputJson} with ${validKeys.length} sprites.`);
}

console.log('Generating precision audio sprites with silence stripping...');
processGender('male', 'InJoon');
processGender('female', 'SunHi');
console.log('Audio sprite generation completed successfully!');
