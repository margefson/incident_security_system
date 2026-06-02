import type { SiemIncidentPayload, SiemPublishContext } from "./types";

export function mapIncidentToSiem(ctx: SiemPublishContext): SiemIncidentPayload {
  const { incident, eventType, reporter, iaMethod } = ctx;
  return {
    source: "incident_security_system",
    event_type: eventType,
    incident_id: incident.id,
    title: incident.title,
    description: incident.description,
    ia_classification: incident.category,
    ia_confidence: incident.confidence ?? 0,
    ia_method: iaMethod,
    risk_level: incident.riskLevel,
    status: incident.status,
    reporter: reporter
      ? {
          id: reporter.id,
          email: reporter.email,
          name: reporter.name,
        }
      : undefined,
    detected_at: (incident.createdAt ?? new Date()).toISOString(),
  };
}
