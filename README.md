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
| **Juniper Mist AI** *(deep dive)*: SLEs, Marvis, vBLE, Wired/WAN Assurance, campus fabric, Access Assurance | L1–L7 | Mist cloud, Marvis, EX, SSR, APs |
| DNS (resolution, records, DNSSEC, DoH/DoT) | L7 | Root → TLD → authoritative tree |
| IP Services (DHCP, NAT, NTP, SNMP, FHRP) | L3–L7 | Star |
| Network Security (ACLs, NGFW, IPsec, 802.1X, Zero Trust) | L2–L7 | Defence-in-depth shells |
| **PKI & Certificates** *(deep dive)*: crypto, X.509, CA hierarchy, SCEP/EST/ACME, CRL/OCSP, TLS, EAP-TLS | L5–L7 | Root → intermediate/issuing CAs → endpoints, OCSP |
| **Post-Quantum Cryptography** *(deep dive)*: quantum threat, ML-KEM/ML-DSA/SLH-DSA, hybrid TLS 1.3, IKEv2, SSH, migration | L3–L7 | ML-DSA CA chain, hybrid TLS and IKEv2 peers, SSH, HSM, harvest-now eavesdropper |
| **Cisco ISE Infrastructure** *(deep dive)*: personas, 802.1X/MAB, policy sets, profiling, guest/BYOD/posture, TrustSec, TACACS+ | L2–L7 | PAN/MnT, PSNs, NADs, endpoints, AD, pxGrid |
| Data Centre (spine-leaf, VXLAN/EVPN, ACI, storage) | L2–L3 | Spine-leaf Clos fabric |
| **Cisco ACI Data Centre** *(deep dive)*: APIC, tenant model, access policies, contracts, L3Out, Multi-Pod/Site, API | L2–L7 | APIC cluster, spines, leaves, EPGs, L3Out, PBR |
| **SD-WAN Concepts** *(deep dive)*: planes, OMP, TLOCs, PnP, control/data/AAR policy, security, Cloud OnRamp, MRF | L3–L7 | Manager/Validator/Controller, hub and branch edges |
| MPLS & Service Provider (L3VPN, SR) | L2.5 | P/PE/CE ring |
| Quality of Service | L2–L3 | Layered |
| Cloud Networking (VPC, transit, K8s) | L3–L7 | Transit gateway hub |
| Network Automation (YANG, NETCONF, Ansible) | Mgmt | Star |

## Features

- **3D domain map:** drag to spin, hover for a CLI-style brief, click a node to open that domain.
- **A 3D topology for each domain:** packets move along the links. Drag to rotate, scroll to zoom.
- **Lessons:** organised into modules, with key points and config/CLI examples. You can mark each lesson complete.
- **Quizzes:** instant feedback with an explanation for every answer. Your best score is remembered.
- **Deep dives:** in-depth tracks for PKI, post-quantum cryptography, SD-WAN, Cisco ISE, Cisco ACI and Juniper Mist, with 5–6 modules each and a "Deep dives" filter on the home page.
- **Learning paths:** Network Associate, Enterprise & Campus, Data Centre & Cloud, Identity & Zero Trust, AI-Driven Wireless Campus, Service Provider and Security Engineer.
- **Subnet Lab:** an IPv4 CIDR calculator with a binary view.
- **Search:** covers every lesson, key point and CLI snippet.
- **Progress tracking:** stored in the browser's `localStorage`.

## Run it

The app has a FastAPI backend (serves the course catalogue) and a React + Vite frontend. Run both:

```bash
# terminal 1: API on http://127.0.0.1:8005
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8005

# terminal 2: frontend on http://localhost:5005 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Backend tests: `cd backend && uv run pytest` (no API key needed; the agent crew is stubbed).

## Content studio (AI agent crew)

Open http://localhost:5005/#studio (also linked in the footer). Pick **Extend a domain** or **New domain**, add an optional focus, and generate. A [CrewAI](https://docs.crewai.com) crew of six agents builds a draft in about two minutes:

| Agent | Produces |
| --- | --- |
| Curriculum researcher | 2–3 module outline (plus catalogue metadata for a new domain) |
| Theory author | Lessons with key points and vendor CLI |
| Visual designer | Mermaid diagrams attached to the lessons that need them |
| 3D topology architect | A validated `topology` for a new domain's 3D scene |
| Assessment designer | 5–7 quiz questions with explanations |
| Technical reviewer | A verdict with specific issues; issues go back to the owning agent, at most twice |

Every agent returns Pydantic-validated JSON; invalid output is sent back to the agent once with the validation error. Drafts are stored in SQLite (`backend/data/netverse.db`) and nothing reaches learners until you press **Publish**. Published drafts are layered on top of `netverse.json` when the catalogue is served, so the hand-written file is never modified.

Setup: put your key in `.env` at the project root and restart the API:

```
OPENAI_API_KEY=sk-...
# optional, defaults to gpt-4o-mini
NETVERSE_MODEL=gpt-4o-mini
```

A generation costs a few cents with `gpt-4o-mini`. That model is fast and cheap but can still get vendor CLI and protocol details wrong, and the reviewer is an AI too: read each draft and its open review issues before publishing. The studio has no login, so run it on localhost only until authentication is added.

## AI tutor

The **Ask the tutor** button (bottom right, every page) opens a chat that answers networking questions from the course itself:

- Each question is matched against every lesson (including published drafts) with a small built-in BM25 search, boosted for the domain you're viewing. The top five lessons are sent to the model as numbered excerpts.
- Answers stream in, cite those excerpts as [1], [2]…, and each citation links straight to the lesson. Anything the course doesn't cover is labelled "(not covered in the course)".
- **Explain this node:** click any device in a domain's 3D topology and the tutor explains its role, using the devices it connects to in that scene as context.

It uses the same `OPENAI_API_KEY` and `NETVERSE_MODEL` as the content studio (one short, streamed request per question; no CrewAI). Conversations live only in the open page and aren't stored.

## Project layout

```
backend/
  app/main.py              FastAPI app: catalogue + draft endpoints (/api/drafts...)
  app/models.py            Pydantic schema for the catalogue and 3D topologies (validated at startup)
  app/store.py             SQLite storage for AI drafts
  app/tutor.py             tutor: BM25 lesson search, grounded prompt, streamed answers (/api/tutor)
  app/crew/                CrewAI agents, output schemas and the generation pipeline
  app/content/netverse.json  course content: domains, modules, lessons, quizzes, paths
  tests/                   API tests
frontend/
  src/App.tsx              hash routing, top bar, catalogue loading
  src/components/          Home, Search, SubnetLab, DomainView, Quiz, Studio, Tutor, Mermaid, TopologyCanvas
  src/three/scenes.ts      Three.js scenes (hero map + per-domain topologies)
  src/lib/                 progress (localStorage), catalogue helpers, subnet maths
  src/styles.css           styles
```

## License

MIT, see [`LICENSE`](LICENSE). Third-party packages keep their own licenses: see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Each `npm run build` writes the full license texts of all bundled packages to `frontend/dist/third-party-licenses.md`, so deploy that file with the site.

## Adding content

Everything you learn from lives in `backend/app/content/netverse.json`. To add a lesson, append `{ "t", "body", "points", "cli"?, "diagram"? }` to a module's `lessons` array (`diagram` is Mermaid source). To add a domain, add an object to `domains` with a unique `id`, a `color` and a `topology`. Set `"deep": true` to mark a domain as a deep dive.

A `topology` describes the domain's 3D scene:

```json
{
  "nodes": [
    { "id": "router-1", "kind": "router", "label": "PE", "pos": [0, 1.2, 0] },
    { "id": "switch-1", "kind": "switch", "label": "Access", "pos": [2, -0.5, 0.4] }
  ],
  "links": [{ "from": "router-1", "to": "switch-1", "style": "dashed" }],
  "effects": [{ "type": "radio", "nodes": ["ap-1"] }, { "type": "shells", "radii": [1.9, 3.6] }]
}
```

- `kind` sets the shape and colour: `core`, `router`, `switch`, `spine`, `leaf`, `server`, `host`, `ap`, `client`, `dns`, `fw`, `cloud`, `hub`, `branch`, `controller`, `ca`, `ocsp`, `psn`, `pan`, `idstore`, `apic`, `epg`, `ai`.
- `pos` is `[x, y, z]` with x and z in -5..5 and y in -3..3.5, so the whole scene stays in frame.
- `style` is `solid` (default) or `dashed` (drawn in the domain colour; use for control-plane or logical links).
- Only the first node with each distinct label gets a label, so repeat a label (for example `"Host"`) to keep busy scenes readable.
- `effects` is optional: `radio` draws expanding Wi-Fi rings around the listed nodes, `shells` draws wireframe security zones.

The API validates the file on startup, and the new domain appears automatically on the 3D map, in the grid, in search and in the quiz.
