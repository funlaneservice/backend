import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { cloudinary } from "../../lib/cloudinary";
import { s3 } from "../../lib/s3";
import { ApiError } from "../../utils/ApiError";

const DEFAULT_DOWNLOAD_URL_TTL_SECONDS = 300;
const CLOUDINARY_RESOURCE_TYPE = "raw";

type StoredKey = { provider: "s3" | "cloudinary"; key: string };

function parseStoredKey(storedKey: string): StoredKey {
  if (storedKey.startsWith("s3:")) {
    return { provider: "s3", key: storedKey.slice("s3:".length) };
  }
  if (storedKey.startsWith("cloudinary:")) {
    return { provider: "cloudinary", key: storedKey.slice("cloudinary:".length) };
  }
  throw new ApiError(500, `Unrecognized storage key format: ${storedKey}`);
}

async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!s3 || !env.awsS3Bucket) {
    throw new Error("S3 is not configured");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `s3:${key}`;
}

async function uploadToCloudinary(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!cloudinary) {
    throw new Error("Cloudinary is not configured");
  }

  const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
  await cloudinary.uploader.upload(dataUri, {
    public_id: key,
    resource_type: CLOUDINARY_RESOURCE_TYPE,
    type: "authenticated",
  });

  return `cloudinary:${key}`;
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (s3 && env.awsS3Bucket) {
    try {
      return await uploadToS3(key, buffer, contentType);
    } catch (err) {
      console.error("[uploads] S3 upload failed, falling back to Cloudinary:", err);
    }
  }

  if (cloudinary) {
    return uploadToCloudinary(key, buffer, contentType);
  }

  throw new ApiError(503, "File storage is not configured");
}

function getS3SignedUrl(key: string, expiresInSeconds: number): Promise<string> {
  if (!s3 || !env.awsS3Bucket) {
    throw new ApiError(503, "S3 is not configured, but this file was stored in S3");
  }

  const command = new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

function getCloudinarySignedUrl(key: string, expiresInSeconds: number): string {
  if (!cloudinary) {
    throw new ApiError(503, "Cloudinary is not configured, but this file was stored in Cloudinary");
  }

  return cloudinary.url(key, {
    resource_type: CLOUDINARY_RESOURCE_TYPE,
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

export async function getSignedDownloadUrl(
  storedKey: string,
  expiresInSeconds: number = DEFAULT_DOWNLOAD_URL_TTL_SECONDS
): Promise<string> {
  const { provider, key } = parseStoredKey(storedKey);

  if (provider === "s3") {
    return getS3SignedUrl(key, expiresInSeconds);
  }

  return getCloudinarySignedUrl(key, expiresInSeconds);
}
