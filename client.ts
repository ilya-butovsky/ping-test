import * as http from "http";
import * as https from "https";
import { IncomingMessage, RequestOptions } from "http";

const PING_TARGET = "https://fundraiseup.com/"
const SERVER_HOSTNAME = "localhost"
const SERVER_PORT = 8080
const TIMEOUT = 10000

type PingInfo = {
  pingId: number;
  deliveryAttempt: number;
  date: number;
  responseTime: number;
};

const stat = {
  allCount: 0,
  successCount: 0,
  errorCount: 0,
  hangCount: 0,
};

let pingNumber = 0;

function sendInfo(opt: RequestOptions, msg: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const req = http.request(opt, (res: IncomingMessage) => {
      resolve(res.statusCode);
    });
    req.write(msg);
    req.on("timeout", () => {
      resolve(0);
    });
    req.end();
  });
}

function ping(): Promise<number> {
  return new Promise<number>((resolve) => {
    const start = Date.now();
    https.get(PING_TARGET, () => {
      resolve(Date.now() - start);
    });
  });
}

function responseLogger(status: number, pingInfo: PingInfo) {
  if (status === 500 || status === 200)
    console.log(
      `SERVER RESPONSE FOR PING ID ${pingInfo.pingId} ATTEMPT: ${pingInfo.deliveryAttempt}: ${status}`
    );
  else
    console.log(
      `SERVER HANG UP: PING ID ${pingInfo.pingId} ATTEMPT ${pingInfo.deliveryAttempt}`
    );
}

function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

async function pingHandler() {
  const pingId = ++pingNumber;
  const date = Date.now();
  const ms = await ping();
  const pingInfo: PingInfo = {
    date,
    responseTime: ms,
    deliveryAttempt: 1,
    pingId,
  };
  while (true) {
    stat.allCount++;
    const body = JSON.stringify(pingInfo);
    console.log(`CLIENT SEND TO SERVER: ${body}`);
    const opt: RequestOptions = {
      hostname: SERVER_HOSTNAME,
      path: "/data",
      port: SERVER_PORT,
      timeout: TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      method: "POST",
    };
    if (pingInfo.deliveryAttempt > 1)
      await sleep(Math.pow(2, pingInfo.deliveryAttempt - 1) / 2);
    const status = await sendInfo(opt, body);
    responseLogger(status, pingInfo);
    if (status === 500) {
      pingInfo.deliveryAttempt++;
      stat.errorCount++;
    } else if (status === 200) {
      stat.successCount++;
      break;
    } else {
      stat.hangCount++;
      break;
    }
  }
}

function recursivePing() {
  pingHandler();
  setTimeout(recursivePing, 1000);
}

function processExitHandler() {
  console.log("\n",stat);
  process.exit(0);
}

recursivePing();

process.on("SIGINT", processExitHandler);
process.on("SIGTERM", processExitHandler);
