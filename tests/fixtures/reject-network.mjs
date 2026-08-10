import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const originalNetConnect = net.connect.bind(net);
const originalNetCreateConnection = net.createConnection.bind(net);

function blocked() {
  throw new Error("OUTBOUND_NETWORK_BLOCKED: build:local is network-free");
}

function isLocalSocket(args) {
  const first = args[0];
  if (typeof first === "string") {
    return first.startsWith("\\\\.\\pipe\\") || first.startsWith("/tmp/");
  }
  if (typeof first === "number") {
    const host = args[1];
    return host === undefined || host === "127.0.0.1" || host === "::1" || host === "localhost";
  }
  if (first && typeof first === "object") {
    if (typeof first.path === "string") return true;
    return first.host === undefined || first.host === "127.0.0.1" || first.host === "::1" || first.host === "localhost";
  }
  return false;
}

function guardedConnect(...args) {
  if (!isLocalSocket(args)) blocked();
  return originalNetConnect(...args);
}

function guardedCreateConnection(...args) {
  if (!isLocalSocket(args)) blocked();
  return originalNetCreateConnection(...args);
}

globalThis.fetch = blocked;
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
net.connect = guardedConnect;
net.createConnection = guardedCreateConnection;
tls.connect = blocked;
dns.lookup = blocked;
dns.resolve = blocked;
dgram.createSocket = blocked;
http2.connect = blocked;

const dnsMethods = [
  "lookup",
  "lookupService",
  "resolve",
  "resolve4",
  "resolve6",
  "resolveAny",
  "resolveCaa",
  "resolveCname",
  "resolveMx",
  "resolveNaptr",
  "resolveNs",
  "resolvePtr",
  "resolveSoa",
  "resolveSrv",
  "resolveTxt",
  "reverse",
];

for (const method of dnsMethods) {
  dns[method] = blocked;
  dns.promises[method] = blocked;
  dns.Resolver.prototype[method] = blocked;
  dns.promises.Resolver.prototype[method] = blocked;
}
