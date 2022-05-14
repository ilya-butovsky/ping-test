import * as http from "http";
import { IncomingMessage, ServerResponse } from "http";

type PingRequestBody = {
  pingId: number;
  deliveryAttempt: number;
  date: number;
  responseTime: number;
};

let pings: PingRequestBody[] = [];

function requestHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "POST" && req.url === "/data") {
    const status = randomResponseStatus();
    if (!status) return;
    else if (status === 200) successResponse(req, res);
    else internalResponse(res);
  }
}

function internalResponse(res: ServerResponse) {
  res.statusCode = 500;
  res.write("INTERNAL SERVER ERROR");
  res.end();
}

async function successResponse(req: IncomingMessage, res: ServerResponse) {
  const body: PingRequestBody = await getReqBody(req);
  console.log(body);
  pings.push(body);
  res.statusCode = 200;
  res.write("OK");
  res.end();
}

function getReqBody(req: IncomingMessage): Promise<PingRequestBody> {
  return new Promise<PingRequestBody>((resolve) => {
    let body = "";
    req.on("data", (data: string) => {
      body += data;
    });
    req.on("end", () => {
      resolve(JSON.parse(body));
    });
  });
}

function randomResponseStatus(): number {
  const random = Math.floor(Math.random() * 100);
  if (random < 60) return 200;
  if (random < 80) return 500;
  return 0;
}

function resultLog() {
  let sum = 0;
  pings.forEach((ping: PingRequestBody) => (sum += ping.responseTime));
  const avg = sum / pings.length;
  pings.sort((a: PingRequestBody, b: PingRequestBody) => {
    return a.pingId < b.pingId ? 1 : -1;
  });
  const median = pings[(pings.length / 2) | 0].responseTime;
  console.log(`\nAVG: ${avg}\nMEDIAN: ${median}`);
}

http.createServer(requestHandler).listen(8080);

process.on("SIGINT", processExitHandler);
process.on("SIGTERM", processExitHandler);

function processExitHandler() {
  resultLog();
  process.exit(0);
}
