import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const client = path.join(dist, "client");
const shell = path.join(client, "_shell.html");

if (!fs.existsSync(shell)) {
  throw new Error("Build did not produce dist/client/_shell.html");
}

fs.cpSync(client, dist, { recursive: true, force: true });
fs.copyFileSync(shell, path.join(dist, "index.html"));
