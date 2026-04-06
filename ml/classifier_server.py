"""
Servidor Flask para Classificação de Incidentes de Segurança
Porta: 5001 (interna, não exposta publicamente)
Endpoint: POST /classify
"""

import os
import sys
import json
import joblib
from flask import Flask, request, jsonify

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.pkl")
METRICS_PATH = os.path.join(SCRIPT_DIR, "metrics.json")

app = Flask(__name__)

# ─── Carregar Modelo ──────────────────────────────────────────────────────────
print(f"[Classifier] Carregando modelo de {MODEL_PATH}...")
try:
    pipeline = joblib.load(MODEL_PATH)
    print("[Classifier] Modelo carregado com sucesso!")
except Exception as e:
    print(f"[Classifier] ERRO ao carregar modelo: {e}")
    pipeline = None

# ─── Carregar Métricas ────────────────────────────────────────────────────────
try:
    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        metrics = json.load(f)
except Exception:
    metrics = {}

# ─── Mapeamento de Risco ──────────────────────────────────────────────────────
RISK_MAP = {
    "phishing": "high",
    "malware": "critical",
    "brute_force": "high",
    "ddos": "medium",
    "vazamento_de_dados": "critical",
    "unknown": "low",
}

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": pipeline is not None,
        "metrics": metrics,
    })

@app.route("/classify", methods=["POST"])
def classify():
    if pipeline is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()

    if not title and not description:
        return jsonify({"error": "title or description required"}), 400

    # Combinar título e descrição (Passo 1 do documento)
    text = f"{title} {description}".lower().strip()

    try:
        category = pipeline.predict([text])[0]
        proba = pipeline.predict_proba([text])[0]
        confidence = float(max(proba))
        risk_level = RISK_MAP.get(category, "low")

        # Retornar todas as probabilidades por categoria
        classes = pipeline.classes_.tolist()
        all_probas = {cls: float(prob) for cls, prob in zip(classes, proba)}

        return jsonify({
            "category": category,
            "confidence": round(confidence, 4),
            "risk_level": risk_level,
            "probabilities": all_probas,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/metrics", methods=["GET"])
def get_metrics():
    return jsonify(metrics)

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"[Classifier] Iniciando servidor na porta {port}...")
    app.run(host="127.0.0.1", port=port, debug=False)
