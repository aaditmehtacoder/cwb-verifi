#!/usr/bin/env node
/**
 * Print scannable QR codes for whatever network this Mac is on right now.
 *
 *   npm run qr
 *
 * Works on a normal Wi-Fi network and on a phone's Personal Hotspot — the IP
 * changes when you switch, so run this again after connecting and the codes
 * regenerate. Every address is probed against the running dev server first;
 * only ones that actually answer are turned into a QR.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const QR = require('qrcode');

const PORT = Number(process.env.PORT || 8081);
const OUT = path.join(__dirname, '..', 'qr');

// Interfaces that never carry a phone: Apple Wireless Direct, VPN, loopback.
const SKIP = /^(lo|awdl|llw|utun|gif|stf|ap\d)/;

function describe(ip) {
  if (ip.startsWith('172.20.10.')) return 'iPhone Personal Hotspot';
  if (ip.startsWith('192.168.43.') || ip.startsWith('192.168.137.')) return 'Android hotspot';
  if (ip.startsWith('169.254.')) return 'self-assigned (no DHCP)';
  return 'Wi-Fi / LAN';
}

// Hotspot subnets first — if you just tethered, that is the address you want.
function rank(ip) {
  if (ip.startsWith('172.20.10.')) return 0;
  if (ip.startsWith('192.168.43.') || ip.startsWith('192.168.137.')) return 1;
  if (ip.startsWith('169.254.')) return 9;
  return 5;
}

function candidates() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (SKIP.test(name)) continue;
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      out.push({ iface: name, ip: a.address, label: describe(a.address) });
    }
  }
  return out.sort((x, y) => rank(x.ip) - rank(y.ip));
}

function get(url, headers = {}, timeout = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { headers, timeout }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('timeout', () => { req.destroy(); resolve(0); });
    req.on('error', () => resolve(0));
  });
}

// The dev server answers a manifest request with expo-platform set. If that
// works from an address, a phone on that network can load the app from it.
async function reachable(ip) {
  const code = await get(`http://${ip}:${PORT}/`, {
    'expo-platform': 'ios',
    Accept: 'application/expo+json,application/json',
  });
  return code === 200;
}

// `expo start --tunnel` runs an ngrok agent with a local API on 4040+.
async function findTunnel() {
  for (let p = 4040; p <= 4045; p += 1) {
    const body = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${p}/api/tunnels`, { timeout: 1200 }, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => resolve(d));
      });
      req.on('timeout', () => { req.destroy(); resolve(''); });
      req.on('error', () => resolve(''));
    });
    if (!body) continue;
    try {
      const t = JSON.parse(body).tunnels.find((x) => x.proto === 'https');
      if (t) return t.public_url.replace(/^https:\/\//, '');
    } catch {
      /* not the ngrok agent */
    }
  }
  return null;
}

(async () => {
  const serverUp = (await get(`http://127.0.0.1:${PORT}/`)) === 200;
  if (!serverUp) {
    console.log(`\n  No dev server on port ${PORT}.`);
    console.log(`  Start one first:  npx expo start --port ${PORT}\n`);
    process.exit(1);
  }

  const found = [];
  for (const c of candidates()) {
    if (await reachable(c.ip)) found.push(c);
  }
  const tunnel = await findTunnel();

  if (!found.length && !tunnel) {
    console.log('\n  The server is running but no network address answers.');
    console.log('  Connect to Wi-Fi or a hotspot, then run this again.\n');
    process.exit(1);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const codes = [];
  found.forEach((c, i) => {
    codes.push({
      file: `${i + 1}-EXPO-GO-${c.label.replace(/[^\w]+/g, '-')}-${c.ip}.png`,
      url: `exp://${c.ip}:${PORT}`,
      how: `Expo Go · ${c.label} (${c.iface})`,
    });
    codes.push({
      file: `${i + 1}b-BROWSER-${c.ip}.png`,
      url: `http://${c.ip}:${PORT}`,
      how: `Phone browser · ${c.label}`,
    });
  });
  if (tunnel) {
    codes.push({ file: 'T-EXPO-GO-tunnel.png', url: `exp://${tunnel}`, how: 'Expo Go · ngrok tunnel' });
    codes.push({ file: 'T-BROWSER-tunnel.png', url: `https://${tunnel}`, how: 'Phone browser · ngrok tunnel' });
  }

  for (const c of codes) {
    await QR.toFile(path.join(OUT, c.file), c.url, {
      width: 900,
      margin: 2,
      color: { dark: '#16232A', light: '#FFFFFF' },
    });
  }

  const hotspot = found.find((c) => rank(c.ip) <= 1);

  console.log('\n  Verifi — scan to run on your phone\n');
  codes.forEach((c) => console.log(`  ${c.how}\n    ${c.url}\n`));

  if (hotspot) {
    console.log(`  Hotspot detected on ${hotspot.iface} (${hotspot.ip}).`);
    console.log('  The phone sharing the hotspot and any phone joined to it can both');
    console.log('  reach this Mac at that address.\n');
  }
  if (tunnel && found.length) {
    // In tunnel mode the dev server pins every bundle URL to the tunnel host, so
    // a LAN/hotspot QR still pulls the app over the internet.
    console.log('  Note: the server is in TUNNEL mode, so even the local codes fetch');
    console.log('  the bundle through ngrok. For hotspot or same-Wi-Fi use, restart');
    console.log('  without the tunnel (npm run lan) — then it stays on the local');
    console.log('  network and needs no internet at all.\n');
  }
  console.log('  Both phones can scan the same code at the same time.');
  console.log('  Expo Go must match the project SDK. If a local code does nothing,');
  console.log('  the network is isolating clients — use the tunnel code instead.\n');

  execFile('open', ['-a', 'Preview', ...codes.map((c) => path.join(OUT, c.file))], () => {});
})();
