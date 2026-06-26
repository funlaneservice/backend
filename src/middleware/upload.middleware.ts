import multer from "multer";
import { ApiError } from "../utils/ApiError";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, PDF.`));
      return;
    }
    cb(null, true);
  },
});
