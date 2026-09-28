function ipToInt(s: string): number | null {
  const p = s.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = +part;
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}
function intToIp(n: number) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}
function ipClass(first: number) {
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D (multicast)";
  return "E (reserved)";
}
function scope(n: number) {
  const a = n >>> 24, b = (n >>> 16) & 255;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Private (RFC 1918)";
  if (a === 100 && b >= 64 && b <= 127) return "Shared / CGNAT (RFC 6598)";
  if (a === 127) return "Loopback";
  if (a === 169 && b === 254) return "Link-local (APIPA)";
  if (a >= 224 && a <= 239) return "Multicast";
  return "Public";
}

export type SubnetResult = { error: string } | { ip: number; prefix: number; rows: [string, string][] };

export function calcSubnet(str: string): SubnetResult {
  const m = str.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/);
  if (!m) return { error: "Use the format address/prefix, for example 10.1.4.20/22." };
  const ip = ipToInt(m[1]);
  const prefix = +m[2];
  if (ip === null) return { error: "Each octet must be a number from 0 to 255." };
  if (prefix > 32) return { error: "The prefix length must be between /0 and /32." };
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const net = (ip & mask) >>> 0;
  const bc = (net | (~mask >>> 0)) >>> 0;
  const size = Math.pow(2, 32 - prefix);
  let first: number, last: number, usable: number;
  if (prefix === 32) { first = last = net; usable = 1; }
  else if (prefix === 31) { first = net; last = bc; usable = 2; }
  else { first = net + 1; last = bc - 1; usable = size - 2; }
  return {
    ip, prefix,
    rows: [
      ["Network", intToIp(net) + "/" + prefix],
      ["Subnet mask", intToIp(mask)],
      ["Wildcard", intToIp(~mask >>> 0)],
      ["Broadcast", prefix >= 31 ? "n/a (" + (prefix === 31 ? "RFC 3021 point-to-point" : "host route") + ")" : intToIp(bc)],
      ["Usable range", intToIp(first) + " – " + intToIp(last)],
      ["Usable hosts", usable.toLocaleString("en-US")],
      ["Total addresses", size.toLocaleString("en-US")],
      ["Class / scope", ipClass(ip >>> 24) + " · " + scope(ip)]
    ]
  };
}
