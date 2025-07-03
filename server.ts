import ip from "ip";

import http from "node:http";
import { networkInterfaces } from "node:os";
import { getIpAddress } from "./src/getIpAddress";

const port = Number(process.env.SERVER_PORT) || 8000;

const availablePorts = [8000, 8001, 8002, 8003, 8004];

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  console.log(`server リクエスト: ${req.method} ${req.url}`);

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Hello World</h1>");
  }

  if (req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "pong!" }));
  }

  if (req.url === "/find") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    const found: { [key: string]: string } = {};
    await Promise.all(
      availablePorts.map(async (port) => {
        try {
          const res = await fetch(`http://${address}:${port}/ping`);
          if (res.ok) {
            const pong = await res.text();
            console.log(`Pong from port ${port}: ${pong}`);
            found[port] = pong;
          } else {
            found[port] = null;
          }
        } catch (error) {
          console.error(`Error fetching from port ${port}. skip.`);
          found[port] = null;
        }
      })
    );
    res.end(JSON.stringify(found));
  }
});

const address = getIpAddress();
console.log(`Server will listen on: ${address}`);

server.listen(port, address, () => {
  console.log(`Server is running at http://${address}:${port}`);
  console.log(`Your IP address is: ${ip.address()}`);
  console.log(
    `Network interfaces: ${JSON.stringify(networkInterfaces(), null, 2)}`
  );
});

const selfServer = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  console.log(`self リクエスト: ${req.method} ${req.url}`);
  const address = getIpAddress();

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(address);
  }

  if (req.url === "/find") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    const found: { [key: string]: string } = {};
    await Promise.all(
      availablePorts.map(async (port) => {
        try {
          const res = await fetch(`http://${address}:${port}/ping`);
          if (res.ok) {
            const pong = await res.text();
            console.log(`Pong from port ${port}: ${pong}`);
            found[port] = pong;
          } else {
            found[port] = null;
          }
        } catch (error) {
          console.error(`Error fetching from port ${port}. skip.`);
          found[port] = null;
        }
      })
    );
    res.end(JSON.stringify(found));
  }
});

selfServer.listen(port, "localhost", () => {
  console.log(`IP Server is running at http://localhost:${port}`);
});
