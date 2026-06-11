// One-shot: set CORS policy on the R2 bucket so the browser can fetch images
// (worksheet PDF builder, tutor chat, etc.). Public bucket of static assets,
// so AllowedOrigins '*' for GET/HEAD is safe.

import 'dotenv/config';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 env vars. Make sure .env.local is populated.');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const corsConfig = {
  CORSRules: [
    {
      AllowedMethods: ['GET', 'HEAD'],
      AllowedOrigins: ['*'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600,
    },
  ],
};

await client.send(new PutBucketCorsCommand({
  Bucket: R2_BUCKET,
  CORSConfiguration: corsConfig,
}));

console.log('CORS policy applied to bucket:', R2_BUCKET);

const current = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
console.log('Verified config:', JSON.stringify(current.CORSRules, null, 2));
