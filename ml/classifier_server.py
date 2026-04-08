"""
Servidor Flask para Classificação de Incidentes de Segurança
Porta: 5001 (interna, não exposta publicamente)

Endpoints:
  GET  /health    - Status do servidor e modelo
  POST /classify  - Classificar incidente (title + description)
  GET  /metrics   - Métricas do modelo atual
  GET  /dataset   - Download do dataset de treinamento (base64 + preview)
  POST /retrain   - Retreinar modelo com novas amostras/categorias
"""

import os
import sys
import json
import base64
import joblib
import numpy as np
from datetime import datetime, timezone
from flask import Flask, request, jsonify

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.pkl")
METRICS_PATH = os.path.join(SCRIPT_DIR, "metrics.json")
DATASET_PATH = os.path.join(SCRIPT_DIR, "incidentes_cybersecurity_2000.xlsx")

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
    "brute force": "high",
    "ddos": "medium",
    "vazamento_de_dados": "critical",
    "vazamento de dados": "critical",
    "unknown": "low",
}

@app.route("/reload-model", methods=["POST"])
def reload_model():
    """Recarrega o modelo e as métricas do disco sem reiniciar o servidor."""
    global pipeline, metrics
    try:
        pipeline = joblib.load(MODEL_PATH)
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            metrics = json.load(f)
        print(f"[Classifier] Modelo recarregado: {metrics.get('dataset_size')} amostras, {len(metrics.get('categories', []))} categorias")
        return jsonify({"status": "ok", "message": "Modelo recarregado com sucesso", "dataset_size": metrics.get("dataset_size"), "categories": metrics.get("categories")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

    text = f"{title} {description}".lower().strip()

    try:
        category = pipeline.predict([text])[0]
        proba = pipeline.predict_proba([text])[0]
        confidence = float(max(proba))
        risk_level = RISK_MAP.get(category, "low")

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

@app.route("/dataset", methods=["GET"])
def get_dataset():
    """Retorna o dataset de treinamento em base64 + preview das primeiras amostras."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(DATASET_PATH)
        ws = wb.active

        # Ler cabeçalhos (suporte a colunas em português e inglês)
        headers = [str(cell.value).lower().strip() if cell.value else "" for cell in ws[1]]
        title_col = next((i for i, h in enumerate(headers) if h in ("title", "titulo", "título")), 0)
        desc_col = next((i for i, h in enumerate(headers) if h in ("description", "descricao", "descrição")), 1)
        cat_col = next((i for i, h in enumerate(headers) if h in ("category", "categoria")), 2)

        # Preview: primeiras 10 linhas
        preview = []
        category_dist = {}
        total = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            cat = str(row[cat_col]) if row[cat_col] else "unknown"
            category_dist[cat] = category_dist.get(cat, 0) + 1
            total += 1
            if len(preview) < 10:
                preview.append({
                    "title": str(row[title_col]) if row[title_col] else "",
                    "description": str(row[desc_col]) if row[desc_col] else "",
                    "category": cat,
                })

        # Encode base64
        with open(DATASET_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        return jsonify({
            "filename": "incidentes_cybersecurity_2000.xlsx",
            "base64": b64,
            "total_samples": total,
            "category_distribution": category_dist,
            "preview": preview,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/retrain", methods=["POST"])
def retrain():
    """
    Retreina o modelo com novas amostras.
    Body: {
      samples: [{ title?, description, category }],
      risk_map?: { category: riskLevel }
    }
    """
    global pipeline, metrics, RISK_MAP

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    new_samples = data.get("samples", [])
    new_risk_map = data.get("risk_map", {})

    if not new_samples:
        return jsonify({"error": "samples array is required and must not be empty"}), 400

    # Validar amostras
    for s in new_samples:
        if not s.get("description", "").strip():
            return jsonify({"error": "Each sample must have a non-empty description"}), 400
        if not s.get("category", "").strip():
            return jsonify({"error": "Each sample must have a non-empty category"}), 400

    try:
        import openpyxl
        from sklearn.pipeline import Pipeline
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.model_selection import cross_val_score

        # Carregar dataset existente (suporte a colunas em português e inglês)
        wb = openpyxl.load_workbook(DATASET_PATH)
        ws = wb.active
        headers = [str(cell.value).lower().strip() if cell.value else "" for cell in ws[1]]
        title_col = next((i for i, h in enumerate(headers) if h in ("title", "titulo", "título")), 0)
        desc_col = next((i for i, h in enumerate(headers) if h in ("description", "descricao", "descrição")), 1)
        cat_col = next((i for i, h in enumerate(headers) if h in ("category", "categoria")), 2)

        texts = []
        labels = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            t = str(row[title_col]) if row[title_col] else ""
            d = str(row[desc_col]) if row[desc_col] else ""
            c = str(row[cat_col]) if row[cat_col] else "unknown"
            # Normalizar categoria: espaços → underscores
            c = c.lower().strip().replace(" ", "_")
            texts.append(f"{t} {d}".lower().strip())
            labels.append(c)
        # Adicionar novas amostras
        new_categories = set()
        for s in new_samples:
            t = str(s.get("title", ""))
            d = str(s.get("description", ""))
            c = str(s.get("category", "")).strip().lower().replace(" ", "_")
            texts.append(f"{t} {d}".lower().strip())
            labels.append(c)
            if c not in labels[:-1]:
                new_categories.add(c)

        # Atualizar RISK_MAP com novas categorias
        for cat, risk in new_risk_map.items():
            RISK_MAP[cat.lower().replace(" ", "_")] = risk
        # Padrão para novas categorias sem risk_map
        for cat in new_categories:
            if cat not in RISK_MAP:
                RISK_MAP[cat] = "medium"

        # Retreinar o pipeline
        new_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                ngram_range=(1, 2),
                max_features=5000,
                sublinear_tf=True,
            )),
            ("clf", MultinomialNB()),
        ])
        new_pipeline.fit(texts, labels)

        # Cross-validation (5-fold)
        cv_scores = cross_val_score(new_pipeline, texts, labels, cv=min(5, len(set(labels))), scoring="accuracy")
        train_acc = float(new_pipeline.score(texts, labels))

        # Salvar novo modelo
        joblib.dump(new_pipeline, MODEL_PATH)
        pipeline = new_pipeline

        # Calcular distribuição de categorias
        cat_dist = {}
        for label in labels:
            cat_dist[label] = cat_dist.get(label, 0) + 1

        # Atualizar métricas
        new_metrics = {
            "method": "TF-IDF + Naive Bayes (MultinomialNB)",
            "dataset_size": len(texts),
            "categories": list(new_pipeline.classes_),
            "cv_accuracy_mean": round(float(np.mean(cv_scores)), 4),
            "cv_accuracy_std": round(float(np.std(cv_scores)), 4),
            "train_accuracy": round(train_acc, 4),
            "category_distribution": cat_dist,
            "new_samples_added": len(new_samples),
            "new_categories": list(new_categories),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(new_metrics, f, ensure_ascii=False, indent=2)
        metrics = new_metrics

        return jsonify({
            "success": True,
            "message": f"Modelo retreinado com {len(texts)} amostras ({len(new_samples)} novas)",
            "metrics": new_metrics,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"[Classifier] Iniciando servidor na porta {port}...")
    app.run(host="127.0.0.1", port=port, debug=False)
