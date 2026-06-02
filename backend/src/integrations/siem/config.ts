export type SiemDelivery = "syslog" | "file";

export type SiemConfig = {
  enabled: boolean;
  provider: string;
  delivery: SiemDelivery;
  syslogHost: string;
  syslogPort: number;
  filePath: string;
};

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
}

export function getSiemConfig(): SiemConfig {
  return {
    enabled: parseBool(process.env.SIEM_ENABLED, false),
    provider: process.env.SIEM_PROVIDER ?? "wazuh",
    delivery: (process.env.WAZUH_DELIVERY as SiemDelivery) ?? "syslog",
    syslogHost: process.env.WAZUH_SYSLOG_HOST ?? "127.0.0.1",
    syslogPort: Number(process.env.WAZUH_SYSLOG_PORT ?? "514"),
    filePath: process.env.WAZUH_LOG_PATH ?? "./data/siem/events.ndjson",
  };
}
