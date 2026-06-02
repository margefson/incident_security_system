"""Caminhos padronizados do módulo ML (relativos à raiz backend/ml/)."""
import os

ML_ROOT = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ML_ROOT, "models")
DATA_TRAIN_DIR = os.path.join(ML_ROOT, "data", "train")
DATA_EVAL_DIR = os.path.join(ML_ROOT, "data", "eval")
LOGS_DIR = os.path.join(ML_ROOT, "logs")

MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")
TRAIN_DATASET_PATH = os.path.join(DATA_TRAIN_DIR, "incidentes_cybersecurity_2000.xlsx")
EVAL_DATASET_PATH = os.path.join(DATA_EVAL_DIR, "incidentes_cybersecurity_100.xlsx")

TRAIN_DATASET_NAME = "incidentes_cybersecurity_2000.xlsx"
EVAL_DATASET_NAME = "incidentes_cybersecurity_100.xlsx"
