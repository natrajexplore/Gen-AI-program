# NetVerse Academy

An all-in-one, 3D learning platform for networking. Every domain sits as a node on an interactive 3D network map. Each domain page has its own live 3D topology, lessons, CLI examples and a quiz.

## Domains

| Domain | Layers | 3D topology |
| --- | --- | --- |
| Network Fundamentals | L1–L4 | Star LAN |
| Switching & VLANs | L2 | Core / distribution / access campus |
| Routing Protocols (static, OSPF, EIGRP, BGP) | L3 | Two-AS routed mesh |
| IPv6 | L3 | Ring |
| Wireless (RF, Wi-Fi 6/7, WLC, WPA3) | L1–L2 | WLC + APs with radio waves |
| DNS (resolution, records, DNSSEC, DoH/DoT) | L7 | Root → TLD → authoritative tree |
| IP Services (DHCP, NAT, NTP, SNMP, FHRP) | L3–L7 | Star |
| Network Security (ACLs, NGFW, IPsec, 802.1X, Zero Trust) | L2–L7 | Defence-in-depth shells |
| Data Centre (spine-leaf, VXLAN/EVPN, ACI, storage) | L2–L3 | Spine-leaf Clos fabric |
| SD-WAN (overlay, app-aware routing, SASE) | L3–L7 | Hub-and-spoke with controller |
| MPLS & Service Provider (L3VPN, SR) | L2.5 | P/PE/CE ring |
| Quality of Service | L2–L3 | Layered |
| Cloud Networking (VPC, transit, K8s) | L3–L7 | Transit gateway hub |
| Network Automation (YANG, NETCONF, Ansible) | Mgmt | Star |

## Features

- **3D domain map:** drag to spin, hover for a CLI-style brief, click a node to open that domain.
- **A 3D topology for each domain:** packets move along the links. Drag to rotate, scroll to zoom.
- **Lessons:** organised into modules, with key points and config/CLI examples. You can mark each lesson complete.
- **Quizzes:** instant feedback with an explanation for every answer. Your best score is remembered.
- **Learning paths:** Network Associate, Enterprise, Data Centre & Cloud, Service Provider and Security Engineer.
- **Subnet Lab:** an IPv4 CIDR calculator with a binary view.
- **Search:** covers every lesson, key point and CLI snippet.
- **Progress tracking:** stored in the browser's `localStorage`.

## Run it

It's a static site with no build step. Serve the folder with any static web server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

It can also be deployed as-is to GitHub Pages, Netlify or any other static host.

## Project layout

```
index.html        page shell
css/styles.css    styles
js/data.js        course content: domains, modules, lessons, quizzes, paths
js/scene.js       Three.js scenes (hero map + per-domain topologies)
js/app.js         routing, rendering, progress, search, quiz, subnet lab
```

## Adding content

Everything you learn from lives in `js/data.js`. To add a lesson, append `{ t, body, points, cli? }` to a module's `lessons` array. To add a domain, add an object to `domains` with a unique `id`, a `color` and a `topo` layout. The available layouts are `star`, `campus`, `mesh`, `ring`, `tree`, `layers`, `spineleaf`, `hubspoke`, `wireless` and `cloud`. The new domain appears automatically on the 3D map, in the grid, in search and in the quiz.

Three.js (r128) is loaded from cdnjs.
