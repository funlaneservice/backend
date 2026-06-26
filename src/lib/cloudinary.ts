import { v2 as cloudinarySdk } from "cloudinary";
import { env } from "../config/env";

const isConfigured = Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

if (isConfigured) {
  cloudinarySdk.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
} else {
  console.warn(
    "[cloudinary] Cloudinary credentials not configured — fallback file storage will be unavailable."
  );
}

export const cloudinary = isConfigured ? cloudinarySdk : null;
