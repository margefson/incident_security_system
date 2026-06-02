import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { FLASK_SCRIPT_REL, ML_PATHS, ML_ROOT } from "./ml.paths.js";

/** Mapeamento de porta → script Python (relativo a backend/ml). */
export const FLASK_SCRIPTS: Record<number, string> = FLASK_SCRIPT_REL;

export async function ensureFlaskRunning(port = 5001): Promise<void> {
  const url = `http://localhost:${port}/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return;
  } catch {
    // Flask não responde — tentar reiniciar
  }
  try {
    const scriptRel = FLASK_SCRIPTS[port] ?? FLASK_SCRIPT_REL[5001];
    const scriptName = path.basename(scriptRel);
    const SCRIPT_PATH = path.join(ML_ROOT, scriptRel);
    const LOG_PATH = path.join(ML_PATHS.logs, `flask_${port}.log`);
    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`[ensureFlaskRunning] Script não encontrado: ${SCRIPT_PATH}`);
      return;
    }
    fs.mkdirSync(ML_PATHS.logs, { recursive: true });
    try {
      execSync(`pkill -f "${scriptName}" 2>/dev/null || true`, { timeout: 5000 });
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { timeout: 5000 });
    } catch {
      /* ignora */
    }
    await new Promise((r) => setTimeout(r, 1000));
    execSync(`nohup python3 ${SCRIPT_PATH} --port ${port} > ${LOG_PATH} 2>&1 &`, {
      timeout: 5000,
      cwd: ML_ROOT,
    });
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok) return;
      } catch {
        /* ainda não respondeu */
      }
    }
  } catch (err) {
    console.error(`[ensureFlaskRunning] Falha ao reiniciar Flask na porta ${port}:`, err);
  }
}

const METRICS_JSON_PATH = ML_PATHS.metrics;

export type MLMetrics = {
  method: string;
  categories: string[];
  training: {
    dataset: string;
    dataset_size: number;
    categories: string[];
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    train_accuracy: number;
    category_distribution: Record<string, number>;
  };
  evaluation: {
    dataset: string;
    dataset_size: number;
    eval_accuracy: number;
    category_distribution: Record<string, number>;
    per_category: Record<
      string,
      { precision: number; recall: number; f1_score: number; support: number }
    >;
    macro_avg: { precision: number; recall: number; f1_score: number };
    weighted_avg: { precision: number; recall: number; f1_score: number };
    confusion_matrix: { labels: string[]; matrix: number[][] };
    evaluated_at: string;
  } | null;
  last_updated?: string;
  last_evaluated?: string | null;
  dataset_size: number;
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  train_accuracy: number;
  category_distribution: Record<string, number>;
};

export function readMetricsJson(): MLMetrics | null {
  try {
    const raw = fs.readFileSync(METRICS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as MLMetrics;
  } catch {
    return null;
  }
}

export const CATEGORY_RISK: Record<string, "critical" | "high" | "medium" | "low"> = {
  phishing: "high",
  malware: "critical",
  brute_force: "high",
  ddos: "medium",
  vazamento_de_dados: "critical",
  unknown: "low",
};

export async function classifyIncident(
  title: string,
  description: string
): Promise<{ category: string; confidence: number; method: string }> {
  try {
    const response = await fetch("http://localhost:5001/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("ML service error");
    const data = (await response.json()) as { category: string; confidence: number };
    return { ...data, method: "ml" };
  } catch {
    return fallbackClassify(title, description);
  }
}

function fallbackClassify(
  title: string,
  description: string
): { category: string; confidence: number; method: string } {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<string, number> = {
    phishing: 0,
    malware: 0,
    brute_force: 0,
    ddos: 0,
    vazamento_de_dados: 0,
  };
  const phishingKw = [
    "phishing",
    "e-mail",
    "email",
    "senha",
    "credencial",
    "link",
    "falso",
    "fraude",
    "redirecionamento",
    "portal falso",
    "webmail",
  ];
  const malwareKw = [
    "malware",
    "vírus",
    "trojan",
    "ransomware",
    "executável",
    "script",
    "backdoor",
    "infecção",
    "botnet",
    "powershell",
    "macro",
    "binário",
  ];
  const bruteKw = [
    "brute",
    "força bruta",
    "tentativas",
    "login",
    "autenticação",
    "senha incorreta",
    "falha",
    "consecutivas",
    "repetidas",
  ];
  const ddosKw = [
    "ddos",
    "dos",
    "tráfego",
    "requisições",
    "indisponível",
    "sobrecarga",
    "pico",
    "volume",
    "simultâneas",
  ];
  const vazamentoKw = [
    "vazamento",
    "exposição",
    "dados",
    "arquivo",
    "planilha",
    "destinatário",
    "não autorizado",
    "sensível",
    "compartilhado",
  ];

  for (const kw of phishingKw) if (text.includes(kw)) scores.phishing += 1;
  for (const kw of malwareKw) if (text.includes(kw)) scores.malware += 1;
  for (const kw of bruteKw) if (text.includes(kw)) scores.brute_force += 1;
  for (const kw of ddosKw) if (text.includes(kw)) scores.ddos += 1;
  for (const kw of vazamentoKw) if (text.includes(kw)) scores.vazamento_de_dados += 1;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) return { category: "unknown", confidence: 0, method: "keyword" };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return {
    category: best[0],
    confidence: Math.round((best[1] / total) * 100) / 100,
    method: "keyword",
  };
}
