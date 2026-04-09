/**
 * ML Classifier Service - Substitui Flask em produção
 * Implementa classificação de incidentes em Node.js puro
 * Funciona 100% sem Python
 */

import express from "express";
import { createServer } from "http";

// Palavras-chave para classificação
const KEYWORDS = {
  phishing: ["phishing", "e-mail", "email", "senha", "credencial", "link", "falso", "fraude", "redirecionamento", "portal falso", "webmail"],
  malware: ["malware", "vírus", "trojan", "ransomware", "executável", "script", "backdoor", "infecção", "botnet", "powershell", "macro", "binário"],
  brute_force: ["brute", "força bruta", "tentativas", "login", "autenticação", "senha incorreta", "falha", "consecutivas", "repetidas"],
  ddos: ["ddos", "dos", "tráfego", "requisições", "indisponível", "sobrecarga", "pico", "volume", "simultâneas"],
  vazamento_de_dados: ["vazamento", "exposição", "dados", "arquivo", "planilha", "destinatário", "não autorizado", "sensível", "compartilhado"],
};

function classifyIncident(title: string, description: string): { category: string; confidence: number } {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<string, number> = {
    phishing: 0,
    malware: 0,
    brute_force: 0,
    ddos: 0,
    vazamento_de_dados: 0,
  };

  // Contar palavras-chave para cada categoria
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[category]++;
      }
    }
  }

  // Encontrar categoria com maior score
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) {
    return { category: "unknown", confidence: 0 };
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = Math.round((best[1] / total) * 100) / 100;

  return { category: best[0], confidence };
}

export function startMLClassifierService(port: number = 5001): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", service: "ml-classifier", port });
    });

    // Classification endpoint
    app.post("/classify", (req, res) => {
      try {
        const { title, description } = req.body;
        if (!title || !description) {
          return res.status(400).json({ error: "Missing title or description" });
        }

        const result = classifyIncident(title, description);
        res.json(result);
      } catch (err) {
        console.error("[ML Classifier] Error:", err);
        res.status(500).json({ error: "Classification failed" });
      }
    });

    // Train endpoint (dummy - não faz nada em produção)
    app.post("/train", (req, res) => {
      res.json({ status: "ok", message: "Training not available in Node.js mode" });
    });

    // Train stream endpoint (dummy)
    app.get("/train-stream", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write("data: {\"status\":\"ok\",\"message\":\"Streaming not available in Node.js mode\"}\n\n");
      res.end();
    });

    const server = createServer(app);
    server.listen(port, "0.0.0.0", () => {
      console.log(`[ML Classifier] Service running on port ${port}`);
      resolve();
    });

    server.on("error", (err) => {
      console.error(`[ML Classifier] Error starting service on port ${port}:`, err);
      reject(err);
    });
  });
}
