export type SiemEventType =
  | "incident.created"
  | "incident.reclassified"
  | "incident.status_changed";

export type SiemIncidentPayload = {
  source: "incident_security_system";
  event_type: SiemEventType;
  incident_id: number;
  title: string;
  description: string;
  ia_classification: string;
  ia_confidence: number;
  ia_method?: string;
  risk_level: string;
  status: string;
  reporter?: {
    id: number;
    email?: string | null;
    name?: string | null;
  };
  detected_at: string;
};

export type SiemPublishContext = {
  eventType: SiemEventType;
  incident: {
    id: number;
    title: string;
    description: string;
    category: string;
    confidence: number | null;
    riskLevel: string;
    status: string;
    createdAt?: Date;
  };
  reporter?: {
    id: number;
    email?: string | null;
    name?: string | null;
  };
  iaMethod?: string;
};
