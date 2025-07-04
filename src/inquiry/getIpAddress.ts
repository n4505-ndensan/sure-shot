import { networkInterfaces } from "os";

export function getIpAddress(): string | undefined {
  const interfaces = networkInterfaces();
  const foundIps = [];
  Object.entries(interfaces).forEach(([name, nets]) => {
    nets.forEach((net) => {
      if (net.address.startsWith("192.")) {
        foundIps.push(net.address);
      }

      if (net.address.startsWith("172.")) {
        // foundIps.push(net.address);
      }
    });
  });
  return foundIps.length > 0 ? foundIps[0] : undefined;
}
