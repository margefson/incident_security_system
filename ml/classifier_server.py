"""
Servidor Flask para Classificação de Incidentes de Segurança
Porta: 5001 (interna, não exposta publicamente)

Metodologia ML:
  - Dataset de TREINAMENTO: incidentes_cybersecurity_2000.xlsx (2000 amostras)
    Usado para treinar o modelo TF-IDF + Naive Bayes.
  - Dataset de AVALIAÇÃO: incidentes_cybersecurity_100.xlsx (100 amostras)
    Usado para avaliar o modelo em produção (conjunto independente, nunca visto no treino).

Endpoints:
  GET  /health       - Status do servidor e modelo
  POST /classify     - Classificar incidente (title + description)
  GET  /metrics      - Métricas do modelo (treino + avaliação)
  GET  /dataset      - Download do dataset de treinamento (base64 + preview)
  GET  /eval-dataset - Download do dataset de avaliação (base64 + preview)
  POST /evaluate     - Avaliar modelo com dataset de avaliação (100 amostras)
  POST /retrain      - Retreinar modelo com novas amostras/categorias
  POST /reload-model - Recarregar modelo do disco sem reiniciar
"""

import os
import json
import base64
import joblib
import numpy as np
from datetime import datetime, timezone
from flask import Flask, request, jsonify

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH         = os.path.join(SCRIPT_DIR, "model.pkl")
METRICS_PATH       = os.path.join(SCRIPT_DIR, "metrics.json")
TRAIN_DATASET_PATH = os.path.join(SCRIPT_DIR, "incidentes_cybersecurity_2000.xlsx")
EVAL_DATASET_PATH  = os.path.join(SCRIPT_DIR, "incidentes_cybersecurity_100.xlsx")

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

# ─── Utilitário: Ler Dataset XLSX ─────────────────────────────────────────────
def _load_dataset(path: str) -> tuple[list[str], list[str]]:
    """Lê um arquivo XLSX e retorna (texts, labels). Suporta colunas em PT e EN."""
    import openpyxl
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    headers = [str(cell.value).lower().strip() if cell.value else "" for cell in ws[1]]
    title_col = next((i for i, h in enumerate(headers) if h in ("title", "titulo", "título")), 0)
    desc_col  = next((i for i, h in enumerate(headers) if h in ("description", "descricao", "descrição")), 1)
    cat_col   = next((i for i, h in enumerate(headers) if h in ("category", "categoria")), 2)
    texts, labels = [], []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        t = str(row[title_col]) if row[title_col] else ""
        d = str(row[desc_col])  if row[desc_col]  else ""
        c = str(row[cat_col])   if row[cat_col]   else "unknown"
        c = c.lower().strip().replace(" ", "_")
        texts.append(f"{t} {d}".lower().strip())
        labels.append(c)
    return texts, labels

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/reload-model", methods=["POST"])
def reload_model():
    """Recarrega o modelo e as métricas do disco sem reiniciar o servidor."""
    global pipeline, metrics
    try:
        pipeline = joblib.load(MODEL_PATH)
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            metrics = json.load(f)
        print(f"[Classifier] Modelo recarregado: {metrics.get('training', {}).get('dataset_size')} amostras de treino")
        return jsonify({
            "status": "ok",
            "message": "Modelo recarregado com sucesso",
            "training_dataset_size": metrics.get("training", {}).get("dataset_size"),
            "categories": metrics.get("training", {}).get("categories"),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": pipeline is not None,
        "train_dataset": "incidentes_cybersecurity_2000.xlsx",
        "eval_dataset": "incidentes_cybersecurity_100.xlsx",
        "metrics": metrics,
    })


@app.route("/classify", methods=["POST"])
def classify():
    """Classifica um incidente usando o modelo treinado com o dataset de 2000 amostras."""
    if pipeline is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    title       = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()

    if not title and not description:
        return jsonify({"error": "title or description required"}), 400

    text = f"{title} {description}".lower().strip()

    try:
        category   = pipeline.predict([text])[0]
        proba      = pipeline.predict_proba([text])[0]
        confidence = float(max(proba))
        risk_level = RISK_MAP.get(category, "low")
        classes    = pipeline.classes_.tolist()
        all_probas = {cls: float(prob) for cls, prob in zip(classes, proba)}

        return jsonify({
            "category":     category,
            "confidence":   round(confidence, 4),
            "risk_level":   risk_level,
            "probabilities": all_probas,
            # Informação metodológica: qual dataset foi usado para treinar o modelo
            "model_info": {
                "train_dataset":      "incidentes_cybersecurity_2000.xlsx",
                "train_dataset_size": metrics.get("training", {}).get("dataset_size", 2000),
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/metrics", methods=["GET"])
def get_metrics():
    """
    Retorna métricas separadas para treino e avaliação.
    Estrutura:
      {
        training: { dataset, dataset_size, train_accuracy, cv_accuracy_mean, ... },
        evaluation: { dataset, dataset_size, eval_accuracy, ... } | null,
        method: "TF-IDF + Naive Bayes",
        categories: [...],
        last_updated: "...",
      }
    """
    return jsonify(metrics)


@app.route("/dataset", methods=["GET"])
def get_dataset():
    """Retorna o dataset de TREINAMENTO (2000 amostras) em base64 + preview."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(TRAIN_DATASET_PATH)
        ws = wb.active
        headers  = [str(cell.value).lower().strip() if cell.value else "" for cell in ws[1]]
        title_col = next((i for i, h in enumerate(headers) if h in ("title", "titulo", "título")), 0)
        desc_col  = next((i for i, h in enumerate(headers) if h in ("description", "descricao", "descrição")), 1)
        cat_col   = next((i for i, h in enumerate(headers) if h in ("category", "categoria")), 2)

        preview, category_dist, total = [], {}, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            cat = str(row[cat_col]) if row[cat_col] else "unknown"
            category_dist[cat] = category_dist.get(cat, 0) + 1
            total += 1
            if len(preview) < 10:
                preview.append({
                    "title":       str(row[title_col]) if row[title_col] else "",
                    "description": str(row[desc_col])  if row[desc_col]  else "",
                    "category":    cat,
                })

        with open(TRAIN_DATASET_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        return jsonify({
            "role":                 "training",
            "filename":             "incidentes_cybersecurity_2000.xlsx",
            "base64":               b64,
            "total_samples":        total,
            "category_distribution": category_dist,
            "preview":              preview,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/eval-dataset", methods=["GET"])
def get_eval_dataset():
    """Retorna o dataset de AVALIAÇÃO (100 amostras) em base64 + preview."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(EVAL_DATASET_PATH)
        ws = wb.active
        headers  = [str(cell.value).lower().strip() if cell.value else "" for cell in ws[1]]
        title_col = next((i for i, h in enumerate(headers) if h in ("title", "titulo", "título")), 0)
        desc_col  = next((i for i, h in enumerate(headers) if h in ("description", "descricao", "descrição")), 1)
        cat_col   = next((i for i, h in enumerate(headers) if h in ("category", "categoria")), 2)

        preview, category_dist, total = [], {}, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            cat = str(row[cat_col]) if row[cat_col] else "unknown"
            category_dist[cat] = category_dist.get(cat, 0) + 1
            total += 1
            if len(preview) < 10:
                preview.append({
                    "title":       str(row[title_col]) if row[title_col] else "",
                    "description": str(row[desc_col])  if row[desc_col]  else "",
                    "category":    cat,
                })

        with open(EVAL_DATASET_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        return jsonify({
            "role":                 "evaluation",
            "filename":             "incidentes_cybersecurity_100.xlsx",
            "base64":               b64,
            "total_samples":        total,
            "category_distribution": category_dist,
            "preview":              preview,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/evaluate", methods=["POST"])
def evaluate():
    """
    Avalia o modelo usando o dataset de AVALIAÇÃO (100 amostras).
    Este conjunto é independente do treino — nunca foi usado para ajustar o modelo.
    Retorna: accuracy, per-category precision/recall/f1, confusion matrix.
    """
    if pipeline is None:
        return jsonify({"error": "Model not loaded"}), 503

    try:
        from sklearn.metrics import (
            accuracy_score, classification_report,
            confusion_matrix,
        )

        eval_texts, eval_labels = _load_dataset(EVAL_DATASET_PATH)
        if not eval_texts:
            return jsonify({"error": "Dataset de avaliação vazio ou não encontrado"}), 500

        predictions = pipeline.predict(eval_texts)
        accuracy    = float(accuracy_score(eval_labels, predictions))

        # Relatório por categoria
        report_dict = classification_report(
            eval_labels, predictions,
            output_dict=True,
            zero_division=0,
        )

        # Matriz de confusão
        classes = sorted(set(eval_labels))
        cm      = confusion_matrix(eval_labels, predictions, labels=classes).tolist()

        # Distribuição do dataset de avaliação
        eval_dist: dict[str, int] = {}
        for lbl in eval_labels:
            eval_dist[lbl] = eval_dist.get(lbl, 0) + 1

        eval_result = {
            "dataset":              "incidentes_cybersecurity_100.xlsx",
            "dataset_size":         len(eval_texts),
            "eval_accuracy":        round(accuracy, 4),
            "category_distribution": eval_dist,
            "per_category":         {
                k: {
                    "precision": round(v["precision"], 4),
                    "recall":    round(v["recall"], 4),
                    "f1_score":  round(v["f1-score"], 4),
                    "support":   int(v["support"]),
                }
                for k, v in report_dict.items()
                if k not in ("accuracy", "macro avg", "weighted avg")
            },
            "macro_avg": {
                "precision": round(report_dict["macro avg"]["precision"], 4),
                "recall":    round(report_dict["macro avg"]["recall"], 4),
                "f1_score":  round(report_dict["macro avg"]["f1-score"], 4),
            },
            "weighted_avg": {
                "precision": round(report_dict["weighted avg"]["precision"], 4),
                "recall":    round(report_dict["weighted avg"]["recall"], 4),
                "f1_score":  round(report_dict["weighted avg"]["f1-score"], 4),
            },
            "confusion_matrix": {
                "labels": classes,
                "matrix": cm,
            },
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Persistir resultado de avaliação nas métricas
        global metrics
        metrics["evaluation"] = eval_result
        metrics["last_evaluated"] = eval_result["evaluated_at"]
        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics, f, ensure_ascii=False, indent=2)

        return jsonify({
            "success":    True,
            "evaluation": eval_result,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/retrain", methods=["POST"])
def retrain():
    """
    Retreina o modelo usando o dataset de TREINAMENTO (2000 amostras)
    mais quaisquer amostras adicionais fornecidas no body.
    O dataset de AVALIAÇÃO (100 amostras) NUNCA é incluído no treino.
    """
    global pipeline, metrics, RISK_MAP

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    new_samples  = data.get("samples", [])
    new_risk_map = data.get("risk_map", {})

    if not new_samples:
        return jsonify({"error": "samples array is required and must not be empty"}), 400

    for s in new_samples:
        if not s.get("description", "").strip():
            return jsonify({"error": "Each sample must have a non-empty description"}), 400
        if not s.get("category", "").strip():
            return jsonify({"error": "Each sample must have a non-empty category"}), 400

    try:
        from sklearn.pipeline import Pipeline
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.model_selection import cross_val_score

        # 1. Carregar APENAS o dataset de treinamento (2000 amostras)
        texts, labels = _load_dataset(TRAIN_DATASET_PATH)

        # 2. Adicionar novas amostras (do banco de dados ou manuais)
        new_categories: set[str] = set()
        for s in new_samples:
            t = str(s.get("title", ""))
            d = str(s.get("description", ""))
            c = str(s.get("category", "")).strip().lower().replace(" ", "_")
            texts.append(f"{t} {d}".lower().strip())
            labels.append(c)
            if c not in labels[:-1]:
                new_categories.add(c)

        # 3. Atualizar RISK_MAP
        for cat, risk in new_risk_map.items():
            RISK_MAP[cat.lower().replace(" ", "_")] = risk
        for cat in new_categories:
            if cat not in RISK_MAP:
                RISK_MAP[cat] = "medium"

        # 4. Retreinar o pipeline
        new_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
            ("clf",   MultinomialNB()),
        ])
        new_pipeline.fit(texts, labels)

        # 5. Cross-validation (5-fold) no conjunto de treino
        cv_scores = cross_val_score(
            new_pipeline, texts, labels,
            cv=min(5, len(set(labels))), scoring="accuracy",
        )
        train_acc = float(new_pipeline.score(texts, labels))

        # 6. Salvar modelo
        joblib.dump(new_pipeline, MODEL_PATH)
        pipeline = new_pipeline

        # 7. Distribuição de categorias no treino
        cat_dist: dict[str, int] = {}
        for label in labels:
            cat_dist[label] = cat_dist.get(label, 0) + 1

        # 8. Atualizar métricas — preservar avaliação anterior se existir
        training_metrics = {
            "dataset":              "incidentes_cybersecurity_2000.xlsx",
            "dataset_size":         len(texts),
            "categories":           list(new_pipeline.classes_),
            "cv_accuracy_mean":     round(float(np.mean(cv_scores)), 4),
            "cv_accuracy_std":      round(float(np.std(cv_scores)), 4),
            "train_accuracy":       round(train_acc, 4),
            "category_distribution": cat_dist,
            "new_samples_added":    len(new_samples),
            "new_categories":       list(new_categories),
        }

        new_metrics = {
            "method":       "TF-IDF + Naive Bayes (MultinomialNB)",
            "categories":   list(new_pipeline.classes_),
            "training":     training_metrics,
            "evaluation":   metrics.get("evaluation"),  # preservar avaliação anterior
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "last_evaluated": metrics.get("last_evaluated"),
            # Campos legados para compatibilidade com código existente
            "dataset_size":         len(texts),
            "cv_accuracy_mean":     round(float(np.mean(cv_scores)), 4),
            "cv_accuracy_std":      round(float(np.std(cv_scores)), 4),
            "train_accuracy":       round(train_acc, 4),
            "category_distribution": cat_dist,
        }

        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(new_metrics, f, ensure_ascii=False, indent=2)
        metrics = new_metrics

        return jsonify({
            "success": True,
            "message": (
                f"Modelo retreinado com {len(texts)} amostras de treino "
                f"({len(new_samples)} novas). "
                f"Dataset de avaliação (100 amostras) preservado separadamente."
            ),
            "metrics": new_metrics,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"[Classifier] Iniciando servidor na porta {port}...")
    print(f"[Classifier] Dataset de TREINAMENTO: {TRAIN_DATASET_PATH}")
    print(f"[Classifier] Dataset de AVALIAÇÃO:   {EVAL_DATASET_PATH}")
    app.run(host="127.0.0.1", port=port, debug=False)
