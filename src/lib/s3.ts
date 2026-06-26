import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";

const isConfigured = Boolean(env.awsRegion && env.awsAccessKeyId && env.awsSecretAccessKey && env.awsS3Bucket);

export const s3 = isConfigured
  ? new S3Client({
      region: env.awsRegion!,
      credentials: {
        accessKeyId: env.awsAccessKeyId!,
        secretAccessKey: env.awsSecretAccessKey!,
      },
    })
  : null;

if (!isConfigured) {
  console.warn(
    "[s3] AWS S3 credentials not configured — file uploads will fail until AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are set."
  );
}
