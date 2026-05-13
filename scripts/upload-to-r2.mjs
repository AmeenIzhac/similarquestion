import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2_* env vars in .env.local');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const FOLDERS = [
  'edexcel-gcse-maths-papers',
  'edexcel-gcse-maths-markschemes',
  'edexcel-gcse-maths-questions',
  'edexcel-gcse-maths-answers',
];

const CONCURRENCY = 24;

const contentType = (file) => {
  const ext = extname(file).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false;
    throw e;
  }
}

async function uploadOne(localPath, key) {
  if (await exists(key)) return 'skip';
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType(localPath),
  }));
  return 'upload';
}

async function runPool(items, worker) {
  let i = 0;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const total = items.length;
  const startedAt = Date.now();
  let lastLog = 0;

  async function next() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        const result = await worker(item);
        if (result === 'upload') uploaded++;
        else if (result === 'skip') skipped++;
      } catch (e) {
        failed++;
        console.error(`  fail ${item.key}: ${e.message}`);
      }
      const done = uploaded + skipped + failed;
      if (Date.now() - lastLog > 1000 || done === total) {
        lastLog = Date.now();
        const pct = ((done / total) * 100).toFixed(1);
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
        process.stdout.write(`\r  ${done}/${total} (${pct}%) — up:${uploaded} skip:${skipped} fail:${failed} — ${elapsed}s     `);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, next));
  process.stdout.write('\n');
  return { uploaded, skipped, failed };
}

const items = [];
for (const folder of FOLDERS) {
  const dir = join('public', folder);
  for (const name of readdirSync(dir)) {
    const localPath = join(dir, name);
    if (!statSync(localPath).isFile()) continue;
    items.push({ localPath, key: `${folder}/${name}` });
  }
}

console.log(`Found ${items.length} files across ${FOLDERS.length} folders.`);
console.log(`Uploading to bucket "${R2_BUCKET}" with concurrency=${CONCURRENCY}...`);

const result = await runPool(items, ({ localPath, key }) => uploadOne(localPath, key));
console.log(`Done. uploaded=${result.uploaded} skipped=${result.skipped} failed=${result.failed}`);
process.exit(result.failed > 0 ? 1 : 0);
