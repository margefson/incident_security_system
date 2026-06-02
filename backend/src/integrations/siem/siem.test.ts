import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dgram from "dgram";
import fs from "fs";
import os from "os";
import path from "path";
import { mapIncidentToSiem } from "./mapIncidentToSiem";
import { getSiemConfig } from "./config";
import { publishSiemEvent } from "./index";

describe("SIEM integration", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapIncidentToSiem gera payload compatível com Wazuh", () => {
    const payload = mapIncidentToSiem({
      eventType: "incident.created",
      incident: {
        id: 42,
        title: "Ransomware detectado",
        description: "Arquivo suspeito em endpoint",
        category: "malware",
        confidence: 0.92,
        riskLevel: "critical",
        status: "open",
        createdAt: new Date("2026-06-02T18:00:00.000Z"),
      },
      reporter: { id: 1, email: "analyst@test.com", name: "Analyst" },
      iaMethod: "ml",
    });

    expect(payload.source).toBe("incident_security_system");
    expect(payload.event_type).toBe("incident.created");
    expect(payload.incident_id).toBe(42);
    expect(payload.ia_classification).toBe("malware");
    expect(payload.risk_level).toBe("critical");
    expect(payload.reporter?.email).toBe("analyst@test.com");
  });

  it("getSiemConfig respeita variáveis de ambiente", () => {
    vi.stubEnv("SIEM_ENABLED", "true");
    vi.stubEnv("WAZUH_DELIVERY", "syslog");
    vi.stubEnv("WAZUH_SYSLOG_HOST", "10.208.1.229");
    vi.stubEnv("WAZUH_SYSLOG_PORT", "514");

    const config = getSiemConfig();
    expect(config.enabled).toBe(true);
    expect(config.delivery).toBe("syslog");
    expect(config.syslogHost).toBe("10.208.1.229");
    expect(config.syslogPort).toBe(514);
  });

  it("publishSiemEvent grava em arquivo quando delivery=file", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "iss-siem-"));
    const logPath = path.join(tmpDir, "events.ndjson");

    vi.stubEnv("SIEM_ENABLED", "true");
    vi.stubEnv("WAZUH_DELIVERY", "file");
    vi.stubEnv("WAZUH_LOG_PATH", logPath);

    await publishSiemEvent({
      eventType: "incident.created",
      incident: {
        id: 7,
        title: "Teste",
        description: "Descricao longa o suficiente",
        category: "phishing",
        confidence: 0.8,
        riskLevel: "high",
        status: "open",
      },
    });

    const content = fs.readFileSync(logPath, "utf8");
    expect(content).toContain('"source":"incident_security_system"');
    expect(content).toContain('"incident_id":7');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("publishSiemEvent envia syslog UDP", async () => {
    const received: Buffer[] = [];
    const server = dgram.createSocket("udp4");
    await new Promise<void>((resolve) => {
      server.on("message", (msg) => {
        received.push(msg);
      });
      server.bind(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    const port = typeof address === "string" ? 0 : address.port;

    vi.stubEnv("SIEM_ENABLED", "true");
    vi.stubEnv("WAZUH_DELIVERY", "syslog");
    vi.stubEnv("WAZUH_SYSLOG_HOST", "127.0.0.1");
    vi.stubEnv("WAZUH_SYSLOG_PORT", String(port));

    await publishSiemEvent({
      eventType: "incident.created",
      incident: {
        id: 9,
        title: "Malware",
        description: "Teste syslog",
        category: "malware",
        confidence: 0.95,
        riskLevel: "critical",
        status: "open",
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    server.close();

    expect(received.length).toBe(1);
    const parsed = JSON.parse(received[0]!.toString()) as { incident_id: number };
    expect(parsed.incident_id).toBe(9);
  });
});
