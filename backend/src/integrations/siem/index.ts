import { getSiemConfig } from "./config";
import { mapIncidentToSiem } from "./mapIncidentToSiem";
import type { SiemPublishContext } from "./types";
import { publishToWazuh } from "./wazuhPublisher";

export { mapIncidentToSiem };
export type { SiemPublishContext, SiemIncidentPayload } from "./types";

export async function publishSiemEvent(ctx: SiemPublishContext): Promise<void> {
  const config = getSiemConfig();
  if (!config.enabled) return;

  const payload = mapIncidentToSiem(ctx);

  try {
    if (config.provider === "wazuh") {
      await publishToWazuh(payload, config);
      console.log(
        `[SIEM] Evento ${payload.event_type} incidente #${payload.incident_id} enviado (${config.delivery})`
      );
    } else {
      console.warn(`[SIEM] Provider desconhecido: ${config.provider}`);
    }
  } catch (err) {
    console.error(
      `[SIEM] Falha ao publicar incidente #${payload.incident_id}:`,
      err instanceof Error ? err.message : err
    );
  }
}
