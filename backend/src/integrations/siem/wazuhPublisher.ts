import dgram from "dgram";
import fs from "fs";
import path from "path";
import type { SiemConfig } from "./config";
import type { SiemIncidentPayload } from "./types";

function sendSyslog(payload: SiemIncidentPayload, config: SiemConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(JSON.stringify(payload), "utf8");
    client.send(message, config.syslogPort, config.syslogHost, (err) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

function appendToFile(payload: SiemIncidentPayload, config: SiemConfig): void {
  const dir = path.dirname(config.filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(config.filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

export async function publishToWazuh(
  payload: SiemIncidentPayload,
  config: SiemConfig
): Promise<void> {
  if (config.delivery === "file") {
    appendToFile(payload, config);
    return;
  }
  await sendSyslog(payload, config);
}
