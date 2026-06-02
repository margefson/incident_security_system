import path from "path";
import { fileURLToPath } from "url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do módulo Python ML (`backend/ml`). */
export const ML_ROOT = path.resolve(srcDir, "../../ml");

export const ML_PATHS = {
  root: ML_ROOT,
  models: path.join(ML_ROOT, "models"),
  metrics: path.join(ML_ROOT, "models", "metrics.json"),
  model: path.join(ML_ROOT, "models", "model.pkl"),
  classifierServer: path.join(ML_ROOT, "servers", "classifier_server.py"),
  pdfServer: path.join(ML_ROOT, "servers", "pdf_server.py"),
  trainScript: path.join(ML_ROOT, "scripts", "train_model.py"),
  trainDataset2000: path.join(
    ML_ROOT,
    "data",
    "train",
    "incidentes_cybersecurity_2000.xlsx"
  ),
  trainDataset5000: path.join(
    ML_ROOT,
    "data",
    "train",
    "dataset_cybersecurity_treinamento_5000.xlsx"
  ),
  evalDataset100: path.join(
    ML_ROOT,
    "data",
    "eval",
    "incidentes_cybersecurity_100.xlsx"
  ),
  logs: path.join(ML_ROOT, "logs"),
} as const;

/** Script Python relativo a `ML_ROOT`, por porta Flask. */
export const FLASK_SCRIPT_REL: Record<number, string> = {
  5001: path.join("servers", "classifier_server.py"),
  5002: path.join("servers", "pdf_server.py"),
};
