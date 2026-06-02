/**
 * Must be the first import of the server entry so process.env is populated
 * before any module reads ENV (ESM hoists static imports).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, "../../../.env") });
