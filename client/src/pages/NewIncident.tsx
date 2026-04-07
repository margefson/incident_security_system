import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Plus, AlertTriangle, Cpu, ChevronRight, Shield, Info } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing", malware: "Malware", brute_force: "Brute Force",
  ddos: "DDoS", vazamento_de_dados: "Vazamento de Dados",
};
const CAT_COLORS: Record<string, string> = {
  phishing: "#3b82f6", malware: "#ef4444", brute_force: "#f97316",
  ddos: "#a855f7", vazamento_de_dados: "#ec4899",
};
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "#ef4444" },
  high:     { label: "Alto",    color: "#f97316" },
  medium:   { label: "Médio",   color: "#eab308" },
  low:      { label: "Baixo",   color: "#22c55e" },
};
const CATEGORY_RISK: Record<string, string> = {
  phishing: "high", malware: "critical", brute_force: "high",
  ddos: "medium", vazamento_de_dados: "critical",
};

export default function NewIncident() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const createMutation = trpc.incidents.create.useMutation({
    onSuccess: (data) => {
      toast.success("Incidente registrado e classificado com sucesso.");
      utils.incidents.list.invalidate();
      utils.incidents.stats.invalidate();
      if (data?.id) navigate(`/incidents/${data.id}`);
      else navigate("/incidents");
    },
    onError: (e) => toast.error(e.message),
  });

  // Client-side keyword preview
  const previewCategory = (() => {
    const text = `${title} ${description}`.toLowerCase();
    const scores: Record<string, number> = { phishing: 0, malware: 0, brute_force: 0, ddos: 0, vazamento_de_dados: 0 };
    const kws: Record<string, string[]> = {
      phishing: ["phishing", "email", "e-mail", "link", "senha", "credencial", "fraude"],
      malware: ["malware", "vírus", "virus", "trojan", "ransomware", "executável", "backdoor"],
      brute_force: ["brute", "força bruta", "tentativas", "login", "falha", "consecutivas"],
      ddos: ["ddos", "dos", "tráfego", "requisições", "indisponível", "sobrecarga"],
      vazamento_de_dados: ["vazamento", "exposição", "dados", "arquivo", "planilha", "não autorizado"],
    };
    for (const [cat, words] of Object.entries(kws)) {
      for (const w of words) if (text.includes(w)) scores[cat]++;
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : null;
  })();

  const previewRisk = previewCategory ? CATEGORY_RISK[previewCategory] : null;
  const isValid = title.trim().length >= 3 && description.trim().length >= 10;

  return (
    <div className="soc-page">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.25rem", fontSize: "0.78rem", color: "oklch(0.45 0.010 240)" }}>
        <button className="soc-link" onClick={() => navigate("/incidents")}>Incidentes</button>
        <ChevronRight size={12} />
        <span style={{ color: "oklch(0.82 0.008 240)" }}>Novo Incidente</span>
      </div>

      {/* Header */}
      <div className="soc-page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="soc-page-title">Registrar Incidente</h1>
          <p className="soc-page-sub">Classificação automática via TF-IDF + Naive Bayes</p>
        </div>
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Form card */}
        <div className="soc-card" style={{ marginBottom: "1rem" }}>
          <div className="soc-card-header">
            <Plus size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
            <span className="soc-card-title">Dados do Incidente</span>
          </div>
          <div className="soc-card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Title */}
              <div>
                <label className="soc-label">
                  Título do Incidente <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="soc-input"
                  placeholder="Ex: Tentativas de phishing detectadas no e-mail corporativo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "oklch(0.38 0.008 240)" }}>Mínimo 3 caracteres</span>
                  <span style={{ fontSize: "0.72rem", color: "oklch(0.38 0.008 240)" }}>{title.length}/255</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="soc-label">
                  Descrição Detalhada <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  className="soc-input"
                  placeholder="Descreva o incidente em detalhes: o que aconteceu, quando, quais sistemas foram afetados, indicadores observados..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  style={{ width: "100%", resize: "vertical", minHeight: 120 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "oklch(0.38 0.008 240)" }}>Mínimo 10 caracteres</span>
                  <span style={{ fontSize: "0.72rem", color: "oklch(0.38 0.008 240)" }}>{description.length}/5000</span>
                </div>
              </div>

              {/* Preview classification */}
              {previewCategory && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: 6, background: "oklch(0.82 0.20 155 / 0.06)", border: "1px solid oklch(0.82 0.20 155 / 0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.75rem", color: "oklch(0.82 0.20 155)" }}>
                    <Cpu size={13} />Pré-visualização da classificação
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    {(() => {
                      const color = CAT_COLORS[previewCategory] ?? "#64748b";
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 500, color, background: `${color}18`, border: `1px solid ${color}30` }}>
                          {CATEGORY_LABELS[previewCategory]}
                        </span>
                      );
                    })()}
                    {previewRisk && (() => {
                      const cfg = RISK_CONFIG[previewRisk] ?? { label: previewRisk, color: "#94a3b8" };
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, color: cfg.color, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}40` }}>
                          Risco: {cfg.label}
                        </span>
                      );
                    })()}
                    <span style={{ fontSize: "0.72rem", color: "oklch(0.45 0.010 240)" }}>
                      (classificação final pelo servidor ML)
                    </span>
                  </div>
                </div>
              )}

              {/* Info note */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.75rem 1rem", borderRadius: 6, background: "#f9731608", border: "1px solid #f9731625" }}>
                <Info size={13} style={{ color: "#f97316", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: "0.78rem", color: "oklch(0.55 0.010 240)", lineHeight: 1.5 }}>
                  O incidente será automaticamente classificado pelo modelo <span style={{ color: "#f97316", fontWeight: 600 }}>TF-IDF + Naive Bayes</span> em uma das 5 categorias de ameaça e receberá um nível de risco associado.
                </p>
              </div>

              {/* Submit */}
              <button
                className="soc-btn soc-btn-primary"
                onClick={() => createMutation.mutate({ title, description })}
                disabled={createMutation.isPending || !isValid}
                style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.875rem", opacity: (!isValid || createMutation.isPending) ? 0.5 : 1 }}
              >
                {createMutation.isPending ? (
                  <><Cpu size={15} style={{ animation: "spin 1s linear infinite" }} />Classificando...</>
                ) : (
                  <><Shield size={15} />Registrar e Classificar</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
