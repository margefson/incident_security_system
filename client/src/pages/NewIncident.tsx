import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PlusCircle, AlertTriangle, Cpu, ChevronRight, Shield } from "lucide-react";
import { toast } from "sonner";
import CyberLayout from "@/components/CyberLayout";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento de Dados",
  unknown: "Desconhecido",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const CATEGORY_RISK: Record<string, string> = {
  phishing: "high",
  malware: "critical",
  brute_force: "high",
  ddos: "medium",
  vazamento_de_dados: "critical",
  unknown: "low",
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

  // Preview classification (keyword-based, client-side)
  const previewCategory = (() => {
    const text = `${title} ${description}`.toLowerCase();
    const scores: Record<string, number> = { phishing: 0, malware: 0, brute_force: 0, ddos: 0, vazamento_de_dados: 0 };
    const kws: Record<string, string[]> = {
      phishing: ["phishing", "email", "e-mail", "link", "senha", "credencial", "fraude", "falso"],
      malware: ["malware", "vírus", "virus", "trojan", "ransomware", "executável", "script", "backdoor"],
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "oklch(0.10 0.015 240)",
    border: "1px solid oklch(0.22 0.03 240)",
    borderRadius: "0.25rem",
    padding: "0.625rem 0.75rem",
    color: "oklch(0.95 0.01 240)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <CyberLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate("/incidents")} className="font-mono text-xs transition-colors" style={{ color: "oklch(0.45 0.02 240)" }}>
            INCIDENTES
          </button>
          <ChevronRight className="w-3 h-3" style={{ color: "oklch(0.35 0.02 240)" }} />
          <span className="font-mono text-xs neon-text-cyan">NOVO REGISTRO</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded" style={{ background: "oklch(0.85 0.2 195 / 0.1)", border: "1px solid oklch(0.85 0.2 195 / 0.3)" }}>
            <PlusCircle className="w-5 h-5 neon-text-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-bold neon-text-cyan tracking-wider" style={{ fontFamily: "Orbitron, JetBrains Mono, monospace", letterSpacing: "0.06em" }}>REGISTRAR INCIDENTE</h1>
            <p className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>Classificação automática via TF-IDF + Naive Bayes</p>
          </div>
        </div>

        {/* Form */}
        <div className="relative p-6 rounded mb-4" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
          <span className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: "1px solid oklch(0.85 0.2 195 / 0.5)", borderLeft: "1px solid oklch(0.85 0.2 195 / 0.5)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: "1px solid oklch(0.85 0.2 195 / 0.5)", borderRight: "1px solid oklch(0.85 0.2 195 / 0.5)" }} />

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>
                TÍTULO DO INCIDENTE <span style={{ color: "oklch(0.65 0.32 0)" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Tentativas de phishing detectadas no e-mail corporativo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "oklch(0.85 0.2 195 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.85 0.2 195 / 0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Mínimo 3 caracteres</span>
                <span className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>{title.length}/255</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>
                DESCRIÇÃO DETALHADA <span style={{ color: "oklch(0.65 0.32 0)" }}>*</span>
              </label>
              <textarea
                placeholder="Descreva o incidente em detalhes: o que aconteceu, quando, quais sistemas foram afetados, indicadores observados..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }}
                onFocus={(e) => { e.target.style.borderColor = "oklch(0.85 0.2 195 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.85 0.2 195 / 0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Mínimo 10 caracteres</span>
                <span className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>{description.length}/5000</span>
              </div>
            </div>

            {/* Preview classification */}
            {previewCategory && (
              <div className="p-3 rounded" style={{ background: "oklch(0.85 0.2 195 / 0.05)", border: "1px solid oklch(0.85 0.2 195 / 0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-3.5 h-3.5 neon-text-cyan" />
                  <span className="font-mono text-xs neon-text-cyan">PRÉ-VISUALIZAÇÃO DA CLASSIFICAÇÃO</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge-${previewCategory} px-2 py-1 rounded font-mono text-xs`}>
                    {CATEGORY_LABELS[previewCategory]}
                  </span>
                  {previewRisk && (
                    <span className={`risk-${previewRisk} px-2 py-1 rounded font-mono text-xs`}>
                      Risco: {RISK_LABELS[previewRisk]}
                    </span>
                  )}
                  <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                    (classificação final pelo servidor ML)
                  </span>
                </div>
              </div>
            )}

            {/* ML note */}
            <div className="p-3 rounded flex items-start gap-2" style={{ background: "oklch(0.65 0.32 0 / 0.05)", border: "1px solid oklch(0.65 0.32 0 / 0.15)" }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.32 0)" }} />
              <p className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
                O incidente será automaticamente classificado pelo modelo <span style={{ color: "oklch(0.65 0.32 0)" }}>TF-IDF + Naive Bayes</span> em uma das 5 categorias de ameaça e receberá um nível de risco associado.
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={() => createMutation.mutate({ title, description })}
              disabled={createMutation.isPending || title.length < 3 || description.length < 10}
              className="w-full py-3 rounded font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "oklch(0.85 0.2 195 / 0.12)", border: "1px solid oklch(0.85 0.2 195 / 0.5)", color: "oklch(0.85 0.2 195)" }}
              onMouseEnter={(e) => { if (!createMutation.isPending) { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.85 0.2 195 / 0.3)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {createMutation.isPending ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  CLASSIFICANDO...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  REGISTRAR E CLASSIFICAR
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </CyberLayout>
  );
}
