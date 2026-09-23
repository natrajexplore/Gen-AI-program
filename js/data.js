/* NetVerse course catalogue.
   Each domain: modules -> lessons, plus a short quiz.
   topo = which 3D topology the domain page draws (see scene.js). */
window.NETVERSE = {
  domains: [
    {
      id: "fundamentals",
      name: "Network Fundamentals",
      short: "Fundamentals",
      color: "#6FA8FF",
      layers: "L1–L4",
      proto: "TCP/IP",
      level: "Beginner",
      hours: 10,
      topo: "star",
      tagline: "The OSI model, Ethernet, IPv4 addressing and how a packet actually crosses a network.",
      modules: [
        {
          title: "Models & Encapsulation",
          lessons: [
            {
              t: "The OSI and TCP/IP models",
              body: "Layered models split networking into jobs that can be built and fixed on their own. OSI has 7 layers; TCP/IP folds them into 4. Engineers still say \"Layer 2 problem\" or \"Layer 7 load balancer\" using OSI numbers.",
              points: [
                "L1 Physical: bits on copper, fiber, radio",
                "L2 Data Link: frames, MAC addresses, switches",
                "L3 Network: packets, IP addresses, routers",
                "L4 Transport: segments, TCP/UDP ports",
                "L5–L7: sessions, encoding, applications (HTTP, DNS, SSH)"
              ]
            },
            {
              t: "Encapsulation & the PDU at each layer",
              body: "As data travels down the stack, each layer wraps it with its own header. The receiver peels those headers off in reverse order. Routers rewrite the L2 header at every hop, but the L3 header (source and destination IP) stays the same end to end, unless NAT changes it.",
              points: [
                "Data → Segment (L4) → Packet (L3) → Frame (L2) → Bits (L1)",
                "Ethernet MTU is 1500 bytes of payload by default",
                "The TTL field is decremented at every router hop"
              ]
            }
          ]
        },
        {
          title: "Ethernet & ARP",
          lessons: [
            {
              t: "Ethernet frames and MAC addresses",
              body: "A MAC address is 48 bits. The first 24 bits (the OUI) identify the vendor. Switches learn the source MAC of each frame they receive and forward on the destination MAC. Unknown unicast, broadcast and multicast frames are flooded.",
              points: [
                "Broadcast MAC: ffff.ffff.ffff",
                "The FCS trailer (CRC-32) detects corrupted frames",
                "Full duplex removes collisions; CSMA/CD is legacy"
              ]
            },
            {
              t: "ARP: joining L3 to L2",
              body: "Before sending to an IP on the local subnet, a host broadcasts an ARP request asking \"who has 10.0.0.1?\". The owner replies by unicast with its MAC. For a remote destination, the host ARPs for its default gateway instead.",
              points: [
                "Gratuitous ARP announces or refreshes a host's own mapping",
                "Proxy ARP lets a router answer on behalf of other hosts",
                "ARP spoofing is mitigated by Dynamic ARP Inspection"
              ],
              cli: "show ip arp\narp -a            # Windows / macOS\nip neigh show     # Linux"
            }
          ]
        },
        {
          title: "IPv4 Addressing & Subnetting",
          lessons: [
            {
              t: "CIDR and subnet masks",
              body: "A prefix length such as /24 says how many leading bits are the network part. Usable hosts = 2^(32 − prefix) − 2. The first address is the network ID and the last is the broadcast. Try the Subnet Lab tool on the home page.",
              points: [
                "/24 → 254 hosts, /26 → 62 hosts, /30 → 2 hosts",
                "/31 is valid for point-to-point links (RFC 3021)",
                "Private ranges: 10/8, 172.16/12, 192.168/16 (RFC 1918)"
              ]
            },
            {
              t: "TCP vs UDP",
              body: "TCP is connection-oriented: a 3-way handshake (SYN, SYN-ACK, ACK), sequencing, retransmission and flow control. UDP is fire-and-forget with an 8-byte header. It suits DNS queries, VoIP and streaming, where late data is useless anyway.",
              points: [
                "Well-known ports: 0–1023",
                "TCP window scaling allows high-bandwidth, high-latency paths",
                "QUIC (HTTP/3) builds reliability on top of UDP/443"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Which OSI layer does a router primarily operate at?", o: ["Layer 2", "Layer 3", "Layer 4", "Layer 7"], a: 1, why: "Routers forward packets based on Layer 3 (IP) addresses." },
        { q: "How many usable hosts are in a /27?", o: ["30", "32", "62", "14"], a: 0, why: "2^5 = 32 addresses, minus network and broadcast = 30." },
        { q: "What does ARP resolve?", o: ["Name to IP", "IP to MAC", "MAC to port", "IP to name"], a: 1, why: "ARP maps a known IPv4 address to its link-layer MAC address." },
        { q: "Which header field stops packets from looping forever?", o: ["Checksum", "TTL", "Flags", "DSCP"], a: 1, why: "Each router decrements TTL and drops the packet when it reaches 0." }
      ]
    },
    {
      id: "switching",
      name: "Switching & VLANs",
      short: "Switching",
      color: "#7C8CFF",
      layers: "L2",
      proto: "802.1Q",
      level: "Beginner",
      hours: 8,
      topo: "campus",
      tagline: "VLANs, trunking, Spanning Tree and EtherChannel: the building blocks of every campus LAN.",
      modules: [
        {
          title: "VLANs & Trunking",
          lessons: [
            {
              t: "VLAN segmentation",
              body: "A VLAN is a separate broadcast domain on shared switch hardware. Access ports carry one VLAN untagged. Traffic between VLANs must be routed, either by a router-on-a-stick or by a Layer 3 switch with SVIs.",
              points: [
                "Normal range VLANs: 1–1005; extended: 1006–4094",
                "Keep user traffic off VLAN 1",
                "A voice VLAN lets a phone and a PC share one port"
              ],
              cli: "vlan 20\n name USERS\ninterface Gi1/0/5\n switchport mode access\n switchport access vlan 20"
            },
            {
              t: "802.1Q trunks",
              body: "Trunks carry many VLANs over one link by inserting a 4-byte tag carrying a 12-bit VLAN ID. Frames in the native VLAN travel untagged, so a native VLAN mismatch between two ends quietly leaks traffic between VLANs.",
              points: [
                "Disable DTP with 'switchport nonegotiate'",
                "Prune unused VLANs with 'switchport trunk allowed vlan'",
                "Double-tagging attacks exploit the native VLAN"
              ]
            }
          ]
        },
        {
          title: "Spanning Tree",
          lessons: [
            {
              t: "STP root election and port roles",
              body: "STP blocks redundant links so Layer 2 loops cannot form. The switch with the lowest bridge ID (priority + MAC) becomes root. Every other switch picks one root port (its lowest cost path to root), and each segment gets one designated port.",
              points: [
                "Default priority 32768 in steps of 4096",
                "Rapid PVST+ (802.1w) converges in about 1–2 seconds",
                "Use PortFast + BPDU Guard on edge ports"
              ],
              cli: "spanning-tree mode rapid-pvst\nspanning-tree vlan 10,20 root primary\nshow spanning-tree vlan 10"
            },
            {
              t: "EtherChannel",
              body: "EtherChannel bundles up to 8 physical links into one logical link. STP sees it as a single port, so every member forwards. LACP (802.3ad) is the open standard; PAgP is Cisco-only.",
              points: [
                "Members must match speed, duplex, VLANs and mode",
                "Load-balancing hashes on MAC, IP or L4 port",
                "LACP modes: active / passive"
              ]
            }
          ]
        },
        {
          title: "Switch Security",
          lessons: [
            {
              t: "Port security, DHCP snooping, DAI",
              body: "Access-layer protections stop rogue devices and address spoofing. DHCP snooping builds a binding table of MAC, IP and port. Dynamic ARP Inspection and IP Source Guard check traffic against that table.",
              points: [
                "Trust only uplinks toward real DHCP servers",
                "Port security limits the MACs learned per port",
                "Storm control caps broadcast floods"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "How many bits identify a VLAN in an 802.1Q tag?", o: ["8", "10", "12", "16"], a: 2, why: "The 12-bit VID allows 4096 values (4094 usable)." },
        { q: "Which switch becomes STP root?", o: ["Highest MAC", "Lowest bridge ID", "Most ports", "Highest priority"], a: 1, why: "Lowest priority + MAC combination wins the election." },
        { q: "What is the open standard for EtherChannel negotiation?", o: ["PAgP", "LACP", "DTP", "VTP"], a: 1, why: "LACP is IEEE 802.3ad / 802.1AX." },
        { q: "Which feature err-disables an edge port that receives a BPDU?", o: ["Root Guard", "Loop Guard", "BPDU Guard", "UDLD"], a: 2, why: "BPDU Guard shuts the port when a BPDU arrives on it." }
      ]
    },
    {
      id: "routing",
      name: "Routing Protocols",
      short: "Routing",
      color: "#F5B83D",
      layers: "L3",
      proto: "OSPF · BGP",
      level: "Intermediate",
      hours: 16,
      topo: "mesh",
      tagline: "Static routes, OSPF, EIGRP, IS-IS and BGP: how routers learn the map of the Internet.",
      modules: [
        {
          title: "Routing Foundations",
          lessons: [
            {
              t: "Longest match and administrative distance",
              body: "A router always picks the most specific (longest) matching prefix. When two protocols offer the same prefix, the lower administrative distance wins. Between equal routes from the same protocol, the lower metric wins.",
              points: [
                "AD: Connected 0, Static 1, eBGP 20, EIGRP 90, OSPF 110, IS-IS 115, RIP 120, iBGP 200",
                "Floating static route = a static with a higher AD, used as backup",
                "ECMP installs several equal-cost paths"
              ],
              cli: "ip route 0.0.0.0 0.0.0.0 203.0.113.1\nip route 0.0.0.0 0.0.0.0 198.51.100.1 250\nshow ip route"
            },
            {
              t: "Distance vector vs link state",
              body: "Distance-vector protocols (RIP, EIGRP) share routes with neighbours: \"routing by rumour\". Link-state protocols (OSPF, IS-IS) flood topology information so every router builds the same map and runs Dijkstra's SPF algorithm on it.",
              points: [
                "RIP: hop count, maximum 15",
                "EIGRP: DUAL algorithm, feasible successors for instant failover",
                "Path vector (BGP): chooses by policy, not just metric"
              ]
            }
          ]
        },
        {
          title: "OSPF",
          lessons: [
            {
              t: "Neighbours, areas and LSAs",
              body: "OSPF routers become neighbours through Hello packets. Multi-access segments elect a DR and a BDR. Areas limit flooding. Area 0 is the backbone and every other area must connect to it through an ABR.",
              points: [
                "Neighbour states: Down → Init → 2-Way → ExStart → Exchange → Loading → Full",
                "LSA types 1/2 stay intra-area, type 3 carries summaries, type 5 carries external routes",
                "Cost = reference bandwidth / interface bandwidth"
              ],
              cli: "router ospf 1\n router-id 1.1.1.1\n auto-cost reference-bandwidth 100000\n network 10.0.0.0 0.0.255.255 area 0\nshow ip ospf neighbor"
            },
            {
              t: "Area types & troubleshooting",
              body: "Stub, totally stubby and NSSA areas shrink LSDBs at the edge. Most adjacency failures come from mismatched hello/dead timers, area ID, subnet, MTU or authentication.",
              points: [
                "Stuck in ExStart/Exchange → usually an MTU mismatch",
                "Duplicate router IDs cause flapping",
                "Summarise only at ABRs and ASBRs"
              ]
            }
          ]
        },
        {
          title: "BGP",
          lessons: [
            {
              t: "eBGP, iBGP and path attributes",
              body: "BGP runs between autonomous systems over TCP port 179. Neighbours are configured by hand. iBGP does not re-advertise routes learned from another iBGP peer, so you need a full mesh, route reflectors or confederations.",
              points: [
                "Best path order: Weight → Local Pref → Locally originated → AS-Path → Origin → MED → eBGP over iBGP → IGP metric",
                "AS-path prepending influences inbound traffic",
                "Communities tag routes for policy"
              ],
              cli: "router bgp 65001\n neighbor 203.0.113.2 remote-as 65002\n address-family ipv4\n  network 198.51.100.0 mask 255.255.255.0\nshow bgp ipv4 unicast summary"
            },
            {
              t: "Securing BGP",
              body: "Route leaks and hijacks are routing's biggest real-world risk. RPKI lets operators validate route origins, and strict prefix filtering stops accidental leaks.",
              points: [
                "Filter customers with prefix lists / IRR data",
                "Enable RPKI ROV: drop 'invalid' origins",
                "Use max-prefix limits and TCP-AO / MD5 on sessions"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Default administrative distance of OSPF?", o: ["90", "100", "110", "120"], a: 2, why: "OSPF uses AD 110." },
        { q: "BGP runs over which transport?", o: ["UDP 179", "TCP 179", "IP proto 89", "IP proto 88"], a: 1, why: "BGP sessions use TCP port 179. OSPF is IP protocol 89 and EIGRP is 88." },
        { q: "Two OSPF neighbours are stuck in ExStart. Most likely cause?", o: ["Area mismatch", "MTU mismatch", "Wrong router ID", "Passive interface"], a: 1, why: "An MTU mismatch stalls the database description exchange." },
        { q: "Which BGP attribute is evaluated first on Cisco routers?", o: ["Local Preference", "AS-Path", "Weight", "MED"], a: 2, why: "Weight is Cisco-local and checked before Local Preference." }
      ]
    },
    {
      id: "ipv6",
      name: "IPv6",
      short: "IPv6",
      color: "#5FD3C0",
      layers: "L3",
      proto: "IPv6 · ND",
      level: "Intermediate",
      hours: 6,
      topo: "ring",
      tagline: "128-bit addressing, SLAAC, Neighbor Discovery and running IPv6 alongside IPv4.",
      modules: [
        {
          title: "Addressing",
          lessons: [
            {
              t: "Address format and types",
              body: "IPv6 addresses are 128 bits written as 8 hextets. Drop leading zeros and replace one run of all-zero hextets with ::. IPv6 has no broadcast; multicast and anycast do that work instead.",
              points: [
                "Global unicast: 2000::/3",
                "Link-local: fe80::/10, on every interface",
                "Unique local: fc00::/7 (the RFC 1918 equivalent)",
                "A standard subnet is a /64"
              ]
            },
            {
              t: "SLAAC and DHCPv6",
              body: "Routers send Router Advertisements carrying the prefix. Hosts build their own address with SLAAC, using EUI-64 or privacy extensions. The RA's M and O flags tell hosts whether to also use stateful or stateless DHCPv6.",
              points: [
                "RA flags: M = managed address, O = other config",
                "RFC 8106 adds DNS servers to RAs",
                "RA Guard blocks rogue routers"
              ],
              cli: "ipv6 unicast-routing\ninterface Gi0/0\n ipv6 address 2001:db8:10::1/64\nshow ipv6 neighbors"
            }
          ]
        },
        {
          title: "Neighbor Discovery",
          lessons: [
            {
              t: "NDP replaces ARP",
              body: "NDP uses ICMPv6 messages: Router Solicitation/Advertisement (133/134) and Neighbor Solicitation/Advertisement (135/136). Duplicate Address Detection checks that an address is unique before the host uses it.",
              points: [
                "Solicited-node multicast: ff02::1:ffXX:XXXX",
                "Blocking all ICMPv6 breaks IPv6",
                "SEND and RA Guard harden NDP"
              ]
            }
          ]
        },
        {
          title: "Transition",
          lessons: [
            {
              t: "Dual stack, tunnels, NAT64",
              body: "Dual stack runs both protocols side by side and is the preferred path. IPv6-only networks reach IPv4 content through NAT64 and DNS64. Tunnels such as 6in4 carry IPv6 across IPv4-only cores.",
              points: [
                "Happy Eyeballs (RFC 8305) races v6 and v4",
                "464XLAT is used on mobile networks",
                "OSPFv3, MP-BGP and EIGRP for IPv6 route v6"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Which prefix is IPv6 link-local?", o: ["fc00::/7", "fe80::/10", "ff00::/8", "2000::/3"], a: 1, why: "fe80::/10 is link-local." },
        { q: "Which ICMPv6 message does a router send to share its prefix?", o: ["NS", "NA", "RS", "RA"], a: 3, why: "Router Advertisement (type 134)." },
        { q: "What replaces broadcast in IPv6?", o: ["Anycast", "Multicast", "Unicast flooding", "Nothing"], a: 1, why: "IPv6 uses multicast groups instead of broadcast." }
      ]
    },
    {
      id: "wireless",
      name: "Wireless",
      short: "Wireless",
      color: "#4FD1E8",
      layers: "L1–L2",
      proto: "802.11",
      level: "Intermediate",
      hours: 12,
      topo: "wireless",
      tagline: "RF fundamentals, the Wi-Fi standards, WLAN architecture, roaming and WPA3.",
      modules: [
        {
          title: "RF Fundamentals",
          lessons: [
            {
              t: "Frequency, channels and power",
              body: "Wi-Fi uses the 2.4, 5 and 6 GHz bands. 2.4 GHz has only three non-overlapping 20 MHz channels (1, 6, 11). 5 GHz and 6 GHz have many more, and 6 GHz can fit 320 MHz channels on Wi-Fi 7.",
              points: [
                "dBm is absolute power: 0 dBm = 1 mW; +3 dB ≈ 2× power",
                "RSSI above −67 dBm is the usual target for voice",
                "SNR = signal − noise; aim for 25 dB or more"
              ]
            },
            {
              t: "Wi-Fi generations",
              body: "Each generation adds spectral efficiency. Wi-Fi 6 (802.11ax) brought OFDMA and BSS colouring for dense sites. Wi-Fi 6E opened 6 GHz. Wi-Fi 7 (802.11be) adds Multi-Link Operation and 4096-QAM.",
              points: [
                "802.11n = Wi-Fi 4, ac = Wi-Fi 5, ax = Wi-Fi 6/6E, be = Wi-Fi 7",
                "MU-MIMO serves several clients at once",
                "Target Wake Time saves IoT battery"
              ]
            }
          ]
        },
        {
          title: "WLAN Architecture",
          lessons: [
            {
              t: "Autonomous, controller and cloud",
              body: "Lightweight APs join a Wireless LAN Controller over CAPWAP (UDP 5246/5247). The controller centralises RF management, security policy and roaming. Cloud-managed designs keep the data plane local and the management plane in the cloud.",
              points: [
                "Split MAC: real-time work on the AP, management on the WLC",
                "FlexConnect / local switching for branch sites",
                "RRM automates channel and power choices"
              ]
            },
            {
              t: "Roaming",
              body: "The client decides when to roam. The network can make roaming faster. 802.11r (Fast BSS Transition) caches keys so voice calls survive the move. 802.11k shares neighbour reports and 802.11v suggests better APs.",
              points: [
                "Aim for 15–20% cell overlap",
                "Sticky clients hurt everyone's airtime",
                "Minimum data rates shrink effective cell size"
              ]
            }
          ]
        },
        {
          title: "Wireless Security",
          lessons: [
            {
              t: "WPA2, WPA3 and 802.1X",
              body: "WPA3-Personal replaces the PSK 4-way handshake with SAE, which resists offline dictionary attacks. Enterprise networks use 802.1X/EAP with a RADIUS server so every user or device has its own credential.",
              points: [
                "EAP-TLS (certificates) is the strongest common method",
                "PMF (802.11w) is mandatory in WPA3",
                "Enhanced Open (OWE) encrypts guest networks"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Non-overlapping channels in 2.4 GHz (North America)?", o: ["1, 5, 9", "1, 6, 11", "1, 7, 13", "36, 40, 44"], a: 1, why: "Channels 1, 6 and 11 do not overlap at 20 MHz." },
        { q: "What does WPA3-Personal use instead of PSK?", o: ["TKIP", "SAE", "LEAP", "WEP"], a: 1, why: "Simultaneous Authentication of Equals (Dragonfly)." },
        { q: "Which amendment provides Fast BSS Transition?", o: ["802.11k", "802.11v", "802.11r", "802.11w"], a: 2, why: "802.11r = FT roaming." },
        { q: "APs tunnel to a WLC using…", o: ["GRE", "CAPWAP", "LWAPP only", "VXLAN"], a: 1, why: "CAPWAP, UDP 5246 (control) and 5247 (data)." }
      ]
    },
    {
      id: "mist",
      name: "Juniper Mist AI",
      short: "Mist",
      color: "#C7D7F5",
      layers: "L1–L7",
      proto: "AIOps · Cloud",
      level: "Advanced",
      deep: true,
      hours: 16,
      topo: "mist",
      tagline: "Deep dive into Juniper Mist (HPE): the microservices cloud, SLEs, Marvis AI, Wi-Fi and vBLE location, Wired and WAN Assurance, campus fabric, Access Assurance and APIs.",
      modules: [
        {
          title: "Mist Cloud Architecture",
          lessons: [
            {
              t: "A microservices cloud as the management plane",
              body: "Juniper Mist (Juniper Networks is now part of HPE) manages access points, EX switches, SRX firewalls and Session Smart Routers from a cloud built on microservices. Features ship continuously without controller upgrades. Devices send rich telemetry to the cloud, where Mist AI analyses it. User traffic never goes through the cloud; only management and telemetry do.",
              points: [
                "Hierarchy: Organisation → Sites → Devices; site groups for scale",
                "Templates (WLAN, switch, WAN edge) keep configuration consistent across sites",
                "Devices are claimed by claim code or bulk-activated with an order's activation code",
                "API-first: everything in the portal is also available through REST, webhooks and WebSockets"
              ]
            },
            {
              t: "Service Level Expectations (SLEs)",
              body: "SLEs measure what users actually experience rather than device uptime. Each SLE has a goal, for example time-to-connect under 2 seconds, and shows the percentage of user-minutes that met it. Failures are broken down by classifiers (DHCP, association, authentication, DNS…) so you can see the root cause straight away.",
              points: [
                "Wireless SLEs: time to connect, successful connects, coverage, roaming, throughput, capacity, AP health",
                "Wired SLEs: throughput, successful connects, switch health",
                "WAN SLEs: WAN edge health, WAN link health, application health",
                "Drill from an org to a site, an AP or a single client"
              ]
            }
          ]
        },
        {
          title: "Marvis & AIOps",
          lessons: [
            {
              t: "Marvis Virtual Network Assistant",
              body: "Marvis is Mist's AI assistant. You can ask it questions in plain language, such as 'why is Priya's laptop having trouble?' or 'list APs with high CPU', and it pulls answers across wireless, wired and WAN telemetry. The Marvis query language lets you run precise searches when you need them.",
              points: [
                "Conversational troubleshooting over any client, device or site",
                "Pulls in dynamic packet captures, automatically collected when failures occur",
                "Feeds support tickets with relevant data automatically"
              ]
            },
            {
              t: "Marvis Actions and Minis",
              body: "Marvis Actions detect problems proactively and suggest fixes: a missing VLAN on a switch port, a bad cable, port flaps, persistently failing clients, authentication or DHCP server failures, AP offline events, and more. Some can be fixed with one click or automatically. Marvis Minis is a digital experience twin: it runs synthetic user tests from APs and switches to find problems before users do.",
              points: [
                "Missing VLAN detection correlates AP client VLANs with switch trunk config",
                "Actions are validated after remediation and closed automatically",
                "Minis run DHCP, DNS, ARP, authentication and application reachability probes on idle infrastructure"
              ]
            }
          ]
        },
        {
          title: "Mist Wireless & Location",
          lessons: [
            {
              t: "Wi-Fi Assurance and AI-driven RRM",
              body: "Mist Wi-Fi Assurance pairs Mist access points with cloud analytics. Radio Resource Management uses reinforcement learning on the coverage and capacity SLEs to change channels and power, rather than only reacting to interference. A dedicated scanning radio on many models monitors RF and security without disturbing clients.",
              points: [
                "Band steering, dynamic VLANs and Multi PSK (per-user or per-device keys) per WLAN",
                "WPA3, OWE and 802.1X with any RADIUS server, or with Mist Access Assurance",
                "Mist Edge tunnels traffic to the data centre (guest anchoring, L2 extension) when needed"
              ]
            },
            {
              t: "Virtual BLE and indoor location",
              body: "Mist APs include a multi-element directional BLE antenna array. Virtual BLE (vBLE) creates virtual beacons in software, so no battery beacons are needed. Machine learning combines received signal strength with angle information to locate BLE devices and apps for wayfinding, proximity and asset tracking.",
              points: [
                "Mist SDK for mobile apps; zones and location analytics",
                "Asset tags for tracking equipment",
                "Floor plans with AP placement are what make location work"
              ]
            }
          ]
        },
        {
          title: "Wired, Campus Fabric & WAN",
          lessons: [
            {
              t: "Wired Assurance with EX switches",
              body: "EX switches onboard to Mist with a claim code or an existing Junos configuration. Port profiles, dynamic port configuration based on LLDP or RADIUS attributes, and switch templates let you configure hundreds of switches as one. Wired SLEs and Marvis Actions (bad cable, port flap, loop, missing VLAN) extend AIOps to the access layer.",
              points: [
                "Dynamic port profiles automatically configure ports for APs, phones and cameras",
                "Virtual Chassis management and remote shell from the cloud",
                "Junos config stays visible; additional CLI can be pushed from templates"
              ]
            },
            {
              t: "Campus fabric with EVPN-VXLAN",
              body: "Mist builds standards-based campus fabrics in a few steps: EVPN multihoming (collapsed core), core-distribution, or campus fabric IP Clos down to the access layer. It generates the underlay, BGP EVPN overlay and VRFs, then verifies the fabric. This replaces spanning tree and MC-LAG in the campus.",
              points: [
                "Group-based policy with VXLAN-GBP at the access layer",
                "The same EVPN concepts as the data centre: type-2 and type-5 routes, ESI multihoming",
                "Topology view with BGP and link health"
              ]
            },
            {
              t: "WAN Assurance with SSR and SRX",
              body: "Session Smart Routers (from the 128 Technology acquisition) use Secure Vector Routing. They route per session without tunnels, and the first packet of each session carries metadata that lets the routers along the path make application-aware decisions. SRX firewalls also integrate for secure SD-WAN branches. WAN SLEs and application visibility complete the Mist AI story from client to cloud.",
              points: [
                "No IPsec overlay tunnels, so there is less packet overhead",
                "Application policies define which networks can reach which applications",
                "Hub-and-spoke or mesh defined in WAN edge templates"
              ]
            }
          ]
        },
        {
          title: "Access Assurance & Automation",
          lessons: [
            {
              t: "Mist Access Assurance (cloud NAC)",
              body: "Access Assurance is a cloud-delivered NAC service. Mist APs and switches proxy 802.1X to Mist's authentication service over RadSec (RADIUS over TLS), so no on-premises RADIUS server is needed. It supports EAP-TLS and EAP-TTLS with identity providers (Microsoft Entra ID, Okta, Google Workspace), MDM integrations and dynamic VLAN/role assignment.",
              points: [
                "Auth policy rules map labels (certificate attributes, IdP groups, MAC labels) to VLANs/roles",
                "Import your CA so client certificates are trusted",
                "Mist Edge can act as an on-premises auth proxy for resilience"
              ]
            },
            {
              t: "APIs, webhooks and infrastructure as code",
              body: "Every Mist function is available through the REST API. Webhooks and WebSocket streams deliver events such as client joins, alarms and audit logs in real time to tools like ServiceNow, Splunk or Slack. The Terraform provider and Python SDK (mistapi) let you manage organisations, sites and templates as code.",
              points: [
                "Create API tokens per user or org with least-privilege roles",
                "Use site variables in templates, e.g. {{mgmt_vlan}}",
                "Global cloud instances: pick the correct API host for your region"
              ],
              cli: "curl -H \"Authorization: Token $MIST_TOKEN\" \\\n  https://api.mist.com/api/v1/sites/$SITE_ID/stats/devices"
            }
          ]
        }
      ],
      quiz: [
        { q: "What do Mist SLEs primarily measure?", o: ["Device uptime", "User experience against goals", "Licence usage", "CPU temperature"], a: 1, why: "SLEs track how often users' experience meets the defined goal." },
        { q: "Marvis Actions do what?", o: ["Upgrade firmware only", "Proactively detect problems and recommend or apply fixes", "Replace RADIUS", "Design floor plans"], a: 1, why: "Actions surface issues like missing VLANs or bad cables." },
        { q: "Virtual BLE removes the need for…", o: ["Access points", "Battery-powered beacons", "Floor plans", "Wi-Fi"], a: 1, why: "vBLE creates software-defined beacons from the AP's antenna array." },
        { q: "Session Smart Router's key difference from tunnel-based SD-WAN?", o: ["Uses GRE only", "Tunnel-free Secure Vector Routing", "Requires MPLS", "No encryption support"], a: 1, why: "SVR carries session metadata without overlay tunnels." },
        { q: "How does Mist Access Assurance receive authentication requests?", o: ["TACACS+", "RADIUS over TLS (RadSec) via Mist devices", "LDAP", "SNMP"], a: 1, why: "APs and switches proxy 802.1X securely to the cloud." },
        { q: "Which Mist feature runs synthetic tests from the infrastructure?", o: ["Marvis Minis", "vBLE", "Mist Edge", "Site groups"], a: 0, why: "Minis act as a digital experience twin." },
        { q: "User data traffic in a Mist deployment goes…", o: ["Always through the Mist cloud", "Directly on the local network (cloud is management/telemetry)", "Only through Mist Edge", "Through the SLE engine"], a: 1, why: "Only management and telemetry go to the cloud unless you tunnel via Mist Edge." }
      ]
    },
    {
      id: "dns",
      name: "DNS",
      short: "DNS",
      color: "#B889FF",
      layers: "L7",
      proto: "UDP/TCP 53",
      level: "Beginner",
      hours: 6,
      topo: "tree",
      tagline: "The Internet's phone book: resolution, record types, caching, DNSSEC and encrypted DNS.",
      modules: [
        {
          title: "How Resolution Works",
          lessons: [
            {
              t: "Recursive vs iterative queries",
              body: "A stub resolver asks a recursive resolver, which walks the tree for it: root servers → TLD servers (.com) → the domain's authoritative servers. Answers are cached for their TTL, so most lookups never leave the resolver.",
              points: [
                "13 root server identities (a–m), anycast to 1,000+ instances",
                "Queries use UDP 53; TCP 53 for large answers and zone transfers",
                "Negative answers (NXDOMAIN) are cached too"
              ],
              cli: "dig +trace www.example.com\nnslookup -type=mx example.com\ndig @1.1.1.1 example.com AAAA"
            },
            {
              t: "Record types",
              body: "Each record maps a name to data of a given type. A zone must have one SOA and at least one NS. A CNAME cannot sit at the zone apex, so providers offer ALIAS or ANAME records as a workaround.",
              points: [
                "A / AAAA: IPv4 / IPv6 address",
                "MX: mail servers, CNAME: alias, TXT: SPF, DKIM, verification",
                "PTR: reverse lookup; SRV: service location; CAA: allowed certificate authorities"
              ]
            }
          ]
        },
        {
          title: "Operating DNS",
          lessons: [
            {
              t: "Zones, TTLs and migrations",
              body: "Primary servers hold the editable zone and secondaries copy it by AXFR/IXFR when the SOA serial increases. Lower TTLs a day before a migration so the change spreads quickly.",
              points: [
                "Restrict zone transfers to known secondaries",
                "Split-horizon DNS serves different answers inside and outside",
                "GSLB uses DNS answers to steer users between sites"
              ]
            }
          ]
        },
        {
          title: "DNS Security",
          lessons: [
            {
              t: "DNSSEC and encrypted DNS",
              body: "DNSSEC signs records (RRSIG) and chains trust from the root through DS records, so resolvers can detect forged answers. DoT (TCP 853) and DoH (HTTPS 443) encrypt the queries themselves for privacy.",
              points: [
                "DNSSEC = integrity, not confidentiality",
                "Cache poisoning (Kaminsky) is mitigated by source-port randomisation plus DNSSEC",
                "DNS filtering / RPZ blocks malware domains"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Which record identifies a domain's mail servers?", o: ["A", "MX", "PTR", "NS"], a: 1, why: "MX (Mail Exchanger)." },
        { q: "DNS over TLS uses which port?", o: ["53", "443", "853", "5353"], a: 2, why: "DoT is TCP 853." },
        { q: "Which record is required at the start of every zone?", o: ["SOA", "CNAME", "TXT", "SRV"], a: 0, why: "The Start of Authority record defines zone parameters." },
        { q: "DNSSEC primarily provides…", o: ["Encryption", "Integrity & authenticity", "Load balancing", "Caching"], a: 1, why: "Signatures prove the data is genuine; they don't hide it." }
      ]
    },
    {
      id: "services",
      name: "IP Services",
      short: "IP Services",
      color: "#8FD16B",
      layers: "L3–L7",
      proto: "DHCP · NAT",
      level: "Beginner",
      hours: 6,
      topo: "star",
      tagline: "DHCP, NAT/PAT, NTP, SNMP, Syslog and first-hop redundancy: the services every network runs.",
      modules: [
        {
          title: "Addressing Services",
          lessons: [
            {
              t: "DHCP and DORA",
              body: "Clients get addresses in four steps: Discover, Offer, Request, Acknowledge. When the server sits on another subnet, the router relays the broadcast using ip helper-address, adding its own giaddr so the server knows which pool to use.",
              points: [
                "UDP 67 (server) / 68 (client)",
                "Option 3 = gateway, 6 = DNS, 43 = vendor (e.g. WLC discovery)",
                "Leases renew at T1 (50%) and rebind at T2 (87.5%)"
              ],
              cli: "ip dhcp pool USERS\n network 10.20.0.0 255.255.255.0\n default-router 10.20.0.1\n dns-server 10.1.1.53\ninterface Vlan20\n ip helper-address 10.1.1.10"
            },
            {
              t: "NAT and PAT",
              body: "Static NAT maps one inside address to one outside address. PAT (NAT overload) shares one public IP among thousands of hosts by tracking source ports. CGNAT does the same at ISP scale using 100.64.0.0/10.",
              points: [
                "Inside local → Inside global translation",
                "NAT breaks end-to-end addressing; IPv6 restores it",
                "NAT is not a firewall, though it often sits on one"
              ]
            }
          ]
        },
        {
          title: "Management Services",
          lessons: [
            {
              t: "NTP, Syslog, SNMP",
              body: "Accurate time (NTP, UDP 123) makes logs line up across devices. Syslog (UDP 514) ships events at severities 0 (emergency) to 7 (debug). SNMPv3 adds authentication and encryption; v1 and v2c send community strings in cleartext.",
              points: [
                "NTP stratum 1 = directly attached to a reference clock",
                "SNMP traps/informs go to UDP 162",
                "Streaming telemetry (gNMI) is replacing SNMP polling"
              ]
            },
            {
              t: "First-hop redundancy",
              body: "HSRP, VRRP and GLBP give hosts a virtual default gateway that survives a router failure. The active router owns the virtual IP and virtual MAC, and a standby takes over within seconds.",
              points: [
                "VRRP is the open standard (RFC 5798)",
                "GLBP load-balances across several gateways",
                "Track uplinks so the priority drops when a WAN link fails"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Correct order of the DHCP exchange?", o: ["Request, Offer, Discover, Ack", "Discover, Offer, Request, Ack", "Discover, Request, Offer, Ack", "Offer, Discover, Ack, Request"], a: 1, why: "DORA." },
        { q: "Which SNMP version supports encryption?", o: ["v1", "v2c", "v3", "None"], a: 2, why: "SNMPv3 with authPriv." },
        { q: "The open-standard FHRP is…", o: ["HSRP", "GLBP", "VRRP", "CARP"], a: 2, why: "VRRP is IETF standard; HSRP and GLBP are Cisco." }
      ]
    },
    {
      id: "security",
      name: "Network Security",
      short: "Security",
      color: "#FF6B7A",
      layers: "L2–L7",
      proto: "IPsec · 802.1X",
      level: "Intermediate",
      hours: 14,
      topo: "layers",
      tagline: "Firewalls, ACLs, VPNs, NAC and Zero Trust: defence in depth for modern networks.",
      modules: [
        {
          title: "Filtering & Firewalls",
          lessons: [
            {
              t: "ACLs",
              body: "ACLs are processed top-down; the first match wins and there is an implicit deny at the end. Place standard ACLs (source only) close to the destination and extended ACLs close to the source.",
              points: [
                "Wildcard mask 0.0.0.255 matches a /24",
                "Order rules from most to least specific",
                "Log deny hits sparingly because logging costs CPU"
              ],
              cli: "ip access-list extended WEB-IN\n permit tcp any host 198.51.100.10 eq 443\n deny ip any any log\ninterface Gi0/1\n ip access-group WEB-IN in"
            },
            {
              t: "Stateful and next-gen firewalls",
              body: "Stateful firewalls track connections so return traffic is allowed automatically. NGFWs add application identification, user identity, IPS, URL filtering and TLS inspection. Zone-based policy defines which zones may talk to which.",
              points: [
                "Default deny between zones",
                "IPS uses signatures plus anomaly detection",
                "Put public-facing servers in a DMZ"
              ]
            }
          ]
        },
        {
          title: "VPNs",
          lessons: [
            {
              t: "IPsec site-to-site",
              body: "IKEv2 authenticates the peers and negotiates keys. ESP (IP protocol 50) then encrypts and authenticates the traffic. Tunnel mode wraps the whole original packet; NAT-T moves ESP into UDP 4500 so it can cross NAT.",
              points: [
                "IKE uses UDP 500",
                "Prefer AES-GCM and DH group 19/20+",
                "Route-based VPNs (VTI) scale better than policy-based ones"
              ]
            },
            {
              t: "Remote access & SSL VPN",
              body: "Client VPNs such as AnyConnect, GlobalProtect and WireGuard carry remote workers into the network. Split tunnelling sends only corporate traffic through the tunnel, which saves bandwidth but reduces visibility.",
              points: [
                "Enforce MFA and device posture",
                "WireGuard: modern crypto, tiny codebase, UDP",
                "ZTNA is replacing full-network VPN access"
              ]
            }
          ]
        },
        {
          title: "Access Control & Zero Trust",
          lessons: [
            {
              t: "802.1X and NAC",
              body: "802.1X has three roles: the supplicant (client), the authenticator (switch or AP) and the authentication server (RADIUS). After authentication the NAC can assign a VLAN, a downloadable ACL or a security group tag.",
              points: [
                "MAB is the fallback for printers and IoT devices",
                "RADIUS: UDP 1812/1813; TACACS+: TCP 49 (device admin)",
                "Posture checks confirm the device is healthy"
              ]
            },
            {
              t: "Zero Trust & SASE",
              body: "Zero Trust means never trust and always verify. Every request is authorised using identity, device and context, whatever network it comes from. SASE combines SD-WAN with cloud security (SWG, CASB, ZTNA, FWaaS).",
              points: [
                "Micro-segmentation limits lateral movement",
                "Least-privilege, per-application access",
                "Continuous verification, not one-time login"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Every ACL ends with…", o: ["Implicit permit", "Implicit deny", "A log statement", "Nothing"], a: 1, why: "Unmatched traffic is denied." },
        { q: "IPsec NAT-Traversal encapsulates ESP in…", o: ["TCP 443", "UDP 500", "UDP 4500", "GRE"], a: 2, why: "NAT-T uses UDP 4500." },
        { q: "In 802.1X, the switch plays which role?", o: ["Supplicant", "Authenticator", "Auth server", "Proxy"], a: 1, why: "The switch or AP relays EAP between the client and RADIUS." },
        { q: "Which protocol is preferred for device-admin AAA?", o: ["RADIUS", "TACACS+", "LDAP", "Kerberos"], a: 1, why: "TACACS+ separates authentication, authorisation and accounting and authorises each command." }
      ]
    },
    {
      id: "pki",
      name: "PKI & Certificates",
      short: "PKI",
      color: "#F472B6",
      layers: "L5–L7",
      proto: "X.509 · TLS",
      level: "Advanced",
      deep: true,
      hours: 16,
      topo: "pki",
      tagline: "Deep dive into public key infrastructure: cryptography, X.509, CA hierarchies, enrollment, revocation, and certificates in TLS, EAP-TLS and IPsec.",
      modules: [
        {
          title: "Cryptography Foundations",
          lessons: [
            {
              t: "Symmetric vs asymmetric cryptography",
              body: "Symmetric ciphers such as AES use one shared key and are fast enough for bulk data. The hard part is sharing that key safely. Asymmetric algorithms (RSA, ECC) use a key pair: what one key does, only the other can undo. Real protocols use asymmetric crypto to authenticate and agree a key, then switch to symmetric encryption.",
              points: [
                "AES-128/256 in GCM mode gives confidentiality and integrity together",
                "RSA 2048/3072 vs ECDSA P-256/P-384: ECC gives equal strength with far smaller keys",
                "(EC)DHE key exchange gives forward secrecy: stolen private keys can't decrypt past sessions",
                "Post-quantum algorithms (ML-KEM, ML-DSA) are being standardised and rolled out in hybrid modes"
              ]
            },
            {
              t: "Hashes and digital signatures",
              body: "A hash function (SHA-256, SHA-384) turns any input into a fixed-size fingerprint. Changing one bit changes the whole output. To sign, the owner hashes the data and signs that hash with the private key. Anyone with the public key can verify that the data is unchanged and came from the key holder.",
              points: [
                "Signatures give integrity, authentication and non-repudiation",
                "SHA-1 and MD5 are broken for signatures; never accept them in certificates",
                "A certificate is simply a signed statement: 'this public key belongs to this name'"
              ]
            }
          ]
        },
        {
          title: "X.509 Certificates",
          lessons: [
            {
              t: "Anatomy of a certificate",
              body: "An X.509 v3 certificate binds a subject to a public key and is signed by an issuer. Validators mostly care about the extensions: what the key may be used for, which names it covers, whether it is a CA, and where to check revocation.",
              points: [
                "Core fields: serial number, issuer, subject, validity (notBefore/notAfter), subject public key, signature algorithm",
                "Subject Alternative Name (SAN): the DNS names/IPs actually checked by browsers; CN alone is ignored",
                "Key Usage (digitalSignature, keyEncipherment, keyCertSign) and Extended Key Usage (serverAuth, clientAuth)",
                "Basic Constraints CA:TRUE plus pathLenConstraint; AKI/SKI link a certificate to its issuer",
                "CRL Distribution Points and Authority Information Access (OCSP URL, issuer certificate URL)"
              ],
              cli: "openssl x509 -in server.crt -noout -text\nopenssl s_client -connect example.com:443 -showcerts"
            },
            {
              t: "CSRs, keys and file formats",
              body: "You generate a key pair and a Certificate Signing Request (PKCS#10) containing the public key and requested names, signed with the private key to prove you hold it. The CA returns a certificate. The same objects come in different containers, and mixing them up is a common deployment headache.",
              points: [
                "PEM: Base64 text with -----BEGIN----- headers; DER: the same data in binary",
                "PKCS#7 (.p7b): certificates/chain only, no private key",
                "PKCS#12 (.pfx/.p12): certificate + chain + private key, password-protected",
                "The private key never leaves the device that created it; protect it with an HSM/TPM where possible"
              ],
              cli: "openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \\\n  -nodes -keyout wlc.key -out wlc.csr \\\n  -subj \"/CN=wlc.corp.example\" -addext \"subjectAltName=DNS:wlc.corp.example\"\nopenssl pkcs12 -export -in wlc.crt -inkey wlc.key -certfile chain.pem -out wlc.p12"
            }
          ]
        },
        {
          title: "CA Hierarchy & Trust",
          lessons: [
            {
              t: "Root, intermediate and issuing CAs",
              body: "A root CA is self-signed and trusted because it sits in a trust store. It is kept offline and only signs intermediate CAs. Issuing CAs sign end-entity certificates. If an issuing CA is compromised you revoke only that branch; the root, and every device's trust in it, survives.",
              points: [
                "Two-tier (offline root + online issuing) suits most enterprises",
                "Three-tier adds policy CAs for large or regulated environments",
                "CA keys belong in Hardware Security Modules (FIPS 140-3)",
                "The Certificate Policy (CP) and Certification Practice Statement (CPS) document the rules"
              ]
            },
            {
              t: "Chain building and path validation",
              body: "A relying party builds a path from the leaf certificate through the intermediates to a trusted root. At every step it checks the signature, validity dates, name and usage constraints, Basic Constraints, and revocation status. Servers must send the intermediates themselves. A missing intermediate is the most common cause of 'untrusted certificate' errors.",
              points: [
                "Trust stores: OS/browser, Java cacerts, network device trustpoints, ISE Trusted Certificates",
                "Cross-signing lets a new root chain up to an older, widely trusted one",
                "Name Constraints limit which domains a subordinate CA may issue for"
              ],
              cli: "openssl verify -CAfile root.pem -untrusted intermediate.pem server.crt"
            }
          ]
        },
        {
          title: "Lifecycle, Enrollment & Revocation",
          lessons: [
            {
              t: "Enrollment protocols",
              body: "Manual CSR copy-and-paste does not scale. Automated protocols let devices request and renew their own certificates, which matters more every year as certificate lifetimes shrink.",
              points: [
                "SCEP: legacy but ubiquitous on network gear and MDM",
                "EST (RFC 7030): SCEP's modern, TLS-based successor",
                "ACME (RFC 8555): automated domain validation, as used by Let's Encrypt",
                "AD CS auto-enrollment pushes machine and user certificates through Group Policy",
                "Public TLS certificate lifetimes are shrinking under CA/Browser Forum rules: 200 days from March 2026, falling to 47 days by 2029"
              ]
            },
            {
              t: "CRL, OCSP and stapling",
              body: "A CRL is a signed list of revoked serial numbers that clients download periodically. Delta CRLs carry only the changes. OCSP answers 'is this one certificate good?' in real time. With OCSP stapling, the server attaches a recent OCSP response to its handshake, which saves the client the lookup and protects its privacy.",
              points: [
                "If the CRL/OCSP responder is unreachable, 'fail open' vs 'fail closed' is a policy choice",
                "Publish CDP/AIA URLs over HTTP (not HTTPS) to avoid circular dependency",
                "Monitor expiry: expired certificates are a top cause of outages"
              ]
            }
          ]
        },
        {
          title: "PKI in Network Engineering",
          lessons: [
            {
              t: "TLS 1.3 and mutual TLS",
              body: "In TLS 1.3 the server sends its certificate chain and a CertificateVerify signature, proving it owns the private key, while ECDHE agrees the session keys. The handshake completes in one round trip. In mutual TLS (mTLS) the server also requests a client certificate, a pattern used in zero trust, service meshes and APIs.",
              points: [
                "TLS 1.3 removed RSA key transport and static DH, so forward secrecy is mandatory",
                "SNI tells the server which certificate to present",
                "TLS inspection re-signs traffic with an enterprise CA the clients must trust"
              ]
            },
            {
              t: "Certificates for 802.1X, VPN and devices",
              body: "EAP-TLS authenticates users and machines to ISE or another RADIUS server using certificates on both sides. It is phishing-resistant and passwordless. IKEv2 site-to-site VPNs scale better with certificate auth than with pre-shared keys. IEEE 802.1AR IDevIDs are factory-installed identities used for secure zero-touch onboarding.",
              points: [
                "Clients must trust the RADIUS server's EAP certificate: push the CA and pin the server name",
                "ISE Certificate Authentication Profiles map certificate attributes to identities",
                "Network devices use a 'trustpoint' to hold a CA and their own identity"
              ],
              cli: "crypto pki trustpoint CORP-CA\n enrollment url http://ca.corp.example:80\n subject-name CN=rtr1.corp.example\n subject-alt-name rtr1.corp.example\n revocation-check crl\n rsakeypair RTR1 2048\ncrypto pki authenticate CORP-CA\ncrypto pki enroll CORP-CA\nshow crypto pki certificates verbose"
            }
          ]
        }
      ],
      quiz: [
        { q: "Which extension lists the DNS names a TLS client actually checks?", o: ["Common Name", "Subject Alternative Name", "Key Usage", "Authority Info Access"], a: 1, why: "Browsers validate SAN; CN matching is deprecated." },
        { q: "Which file format bundles certificate, chain AND private key?", o: ["PEM certificate", "DER", "PKCS#7", "PKCS#12"], a: 3, why: "PKCS#12 (.pfx/.p12) carries the key, protected by a password." },
        { q: "Why is a root CA usually kept offline?", o: ["To speed up OCSP", "To protect the key that anchors all trust", "Because roots can't sign CRLs", "Licensing"], a: 1, why: "Compromise of the root breaks the entire hierarchy." },
        { q: "OCSP stapling means…", o: ["The client caches the CRL", "The server includes a signed OCSP response in the handshake", "The CA emails revocations", "Certificates never expire"], a: 1, why: "The server fetches and attaches the OCSP response." },
        { q: "Which enrollment protocol does Let's Encrypt use?", o: ["SCEP", "EST", "ACME", "CMP"], a: 2, why: "ACME, RFC 8555." },
        { q: "The most common cause of 'untrusted certificate' on an otherwise valid server cert?", o: ["Wrong key size", "Missing intermediate certificate", "SAN too long", "Using ECC"], a: 1, why: "Servers must send the intermediate chain." },
        { q: "What gives TLS forward secrecy?", o: ["RSA key transport", "Ephemeral (EC)DHE key exchange", "SHA-256", "Longer certificates"], a: 1, why: "Ephemeral keys are discarded after each session." }
      ]
    },
    {
      id: "ise",
      name: "Cisco ISE Infrastructure",
      short: "ISE",
      color: "#38BDF8",
      layers: "L2–L7",
      proto: "RADIUS · TrustSec",
      level: "Advanced",
      deep: true,
      hours: 20,
      topo: "ise",
      tagline: "Deep dive into Cisco Identity Services Engine: personas and deployment, 802.1X/MAB, policy sets, profiling, guest, BYOD, posture, TrustSec and device admin.",
      modules: [
        {
          title: "ISE Architecture & Deployment",
          lessons: [
            {
              t: "Personas: PAN, MnT, PSN and pxGrid",
              body: "Cisco ISE is a policy engine that decides who and what gets onto the network. Its functions are split into personas that can share a node or run on dedicated nodes. The Policy Administration Node (PAN) is where you configure everything. Monitoring and Troubleshooting (MnT) nodes collect logs and Live Logs. Policy Service Nodes (PSNs) answer RADIUS and TACACS+ requests and run portals and profiling. pxGrid shares context with other security products.",
              points: [
                "Primary and secondary PAN: promotion to primary is manual by default, or automatic with PAN auto-failover",
                "Primary/secondary MnT: logs are sent to both",
                "PSNs are active/active; group them in node groups behind a load balancer or in the NAD's server list",
                "Licensing tiers: Essentials (basic AAA), Advantage (profiling, BYOD, TrustSec, pxGrid), Premier (posture, compliance)"
              ]
            },
            {
              t: "Deployment models and sizing",
              body: "A standalone node suits labs. A small deployment runs two nodes with all personas on both. Medium deployments put PAN and MnT on two nodes with dedicated PSNs. Large deployments dedicate every persona and scale out the PSNs. Place PSNs close to their users and keep round-trip latency between nodes within Cisco's limits.",
              points: [
                "Size by concurrent active endpoints per PSN (appliance/VM specific)",
                "Every node must resolve every other node in DNS (forward and reverse) and use NTP",
                "Replication: the PAN pushes configuration to every node over TLS",
                "Patch and upgrade PAN first; use split upgrades for zero downtime"
              ]
            },
            {
              t: "Certificates in ISE",
              body: "ISE relies heavily on PKI. The Admin certificate secures the GUI and node-to-node communication. The EAP certificate is presented to supplicants during PEAP and EAP-TLS. The Portal certificate secures guest and BYOD pages. The pxGrid certificate authenticates the pxGrid service. The built-in Internal CA issues certificates to BYOD devices and pxGrid clients.",
              points: [
                "Use a publicly trusted Portal certificate so guests don't see warnings",
                "Changing the Admin certificate restarts services on that node, so plan a maintenance window",
                "Trust the CA chains that issued your clients' certificates under Trusted Certificates"
              ]
            }
          ]
        },
        {
          title: "Network Device Integration",
          lessons: [
            {
              t: "802.1X, MAB and the NAD configuration",
              body: "The switch or WLC is the Network Access Device (NAD, the authenticator). 802.1X carries EAP from the supplicant to ISE inside RADIUS. MAB (MAC Authentication Bypass) handles devices without supplicants, such as printers, cameras and IoT, using the MAC address as the identity. Authentication order and priority decide what happens when a port supports both.",
              points: [
                "RADIUS authentication UDP 1812, accounting UDP 1813",
                "Change of Authorization (CoA) lets ISE re-authenticate or bounce a session; Cisco ISE listens on UDP 1700 by default (RFC 5176 uses 3799)",
                "Always send accounting; ISE's session state depends on it",
                "Add the NAD in ISE with the same shared secret and its device type and location"
              ],
              cli: "aaa new-model\nradius server ISE-PSN1\n address ipv4 10.10.10.21 auth-port 1812 acct-port 1813\n key <secret>\naaa group server radius ISE\n server name ISE-PSN1\naaa authentication dot1x default group ISE\naaa authorization network default group ISE\naaa accounting dot1x default start-stop group ISE\naaa server radius dynamic-author\n client 10.10.10.21 server-key <secret>\ndot1x system-auth-control\n!\ninterface Gi1/0/10\n switchport mode access\n authentication port-control auto\n authentication order dot1x mab\n mab\n dot1x pae authenticator"
            },
            {
              t: "Phased rollout: monitor, low-impact, closed",
              body: "Turning on 802.1X everywhere at once causes outages. Monitor mode (open authentication) authenticates without enforcing, so you can fix failures in Live Logs. Low-impact mode allows limited access (DHCP, DNS, ISE) through a pre-auth port ACL, then applies a dACL after authentication. Closed mode allows nothing until authentication succeeds.",
              points: [
                "Track 'unknown' endpoints before enforcing",
                "IBNS 2.0 (policy-map type control subscriber) replaces legacy 'authentication' commands",
                "Critical VLAN/ACL keeps users working if every PSN is unreachable"
              ],
              cli: "show access-session interface Gi1/0/10 details\ntest aaa group ISE user1 Passw0rd new-code\nshow aaa servers"
            }
          ]
        },
        {
          title: "Policy Sets, Identity & Profiling",
          lessons: [
            {
              t: "Policy sets, authentication and authorization",
              body: "Policy sets are evaluated top-down and are matched on conditions such as device type, location, SSID or protocol. Inside a set, the authentication policy chooses which identity source validates the credentials. The authorization policy then chooses the result: an authorization profile carrying a VLAN, a downloadable ACL, an SGT, a redirect URL or a reauth timer.",
              points: [
                "Identity sources: internal users/endpoints, Active Directory join points, LDAP, RADIUS token, SAML IdP, certificate profiles",
                "Identity source sequences try stores in order",
                "Allowed Protocols decide which EAP methods (PEAP, EAP-TLS, TEAP, EAP-FAST) are accepted",
                "Keep rules specific-to-general, and watch hit counters to find unused rules"
              ]
            },
            {
              t: "Profiling endpoints",
              body: "The profiler classifies endpoints (Windows PC, iPhone, Cisco IP phone, Axis camera) using data from probes. Profiles feed authorization, so a camera lands in the camera VLAN with a camera dACL without anyone entering its MAC address.",
              points: [
                "Probes: RADIUS, DHCP (via helper or Device Sensor), HTTP, SNMP, NMAP, NetFlow, DNS, AD, pxGrid",
                "Device Sensor on switches/WLCs sends CDP/LLDP/DHCP attributes in RADIUS accounting",
                "Profile changes can trigger CoA; use certainty factors and logical profiles",
                "Update the feed service regularly for new device signatures"
              ]
            }
          ]
        },
        {
          title: "Guest, BYOD & Posture",
          lessons: [
            {
              t: "Guest access with Central Web Authentication",
              body: "An unknown device fails MAB, and ISE returns a redirect: a redirect ACL plus a URL to the guest portal on a PSN. After the user logs in (hotspot, self-registration or sponsored account), ISE sends a CoA and the session re-authenticates with guest access.",
              points: [
                "Portal types: Hotspot (AUP only), Self-Registered, Sponsored",
                "The redirect ACL on the NAD decides what gets redirected (permit = redirect)",
                "Guest data retention and purge policies matter for privacy"
              ]
            },
            {
              t: "BYOD onboarding",
              body: "In the BYOD flow, users register their own device through a portal. ISE pushes a Native Supplicant Provisioning profile and a certificate from its internal CA, and the device reconnects with EAP-TLS to the corporate SSID. Users can manage their devices, or report them lost, in the My Devices portal.",
              points: [
                "Single-SSID vs dual-SSID (open onboarding SSID) flows",
                "Blocklisting a lost device revokes its certificate",
                "MDM integration can require enrollment before access"
              ]
            },
            {
              t: "Posture assessment",
              body: "Posture checks device health before granting full access: anti-malware running and up to date, disk encrypted, patches installed, firewall on. Cisco Secure Client's ISE Posture module reports status as Compliant, Non-compliant or Unknown. Authorization rules match on that status and can remediate automatically.",
              points: [
                "Posture requirements = conditions + remediation actions",
                "Posture lease avoids re-scanning on every connection",
                "Agentless posture (via script) and temporal agent options exist"
              ]
            }
          ]
        },
        {
          title: "TrustSec, pxGrid & Device Admin",
          lessons: [
            {
              t: "TrustSec segmentation with SGTs",
              body: "Instead of IP-based ACLs, ISE assigns each session a Security Group Tag (SGT) based on who and what it is. Enforcement switches apply SGACLs from a source × destination matrix, so policy follows the user wherever they connect.",
              points: [
                "Propagation: inline tagging (Cisco Metadata in the frame) or SXP (IP-to-SGT over TCP 64999)",
                "Enforcement happens at egress on SGACL-capable devices",
                "Also the basis of segmentation in SD-Access and on Secure Firewall"
              ],
              cli: "cts role-based enforcement\ncts role-based enforcement vlan-list 10,20\nshow cts role-based permissions\nshow cts role-based sgt-map all"
            },
            {
              t: "pxGrid context sharing",
              body: "pxGrid is a publish/subscribe bus (pxGrid 2.0 uses WebSocket/REST with certificates). Firewalls, SIEMs and NDR tools subscribe to learn the user, device type, SGT and posture behind each IP. They can also ask ISE to quarantine an endpoint through Adaptive Network Control (ANC).",
              points: [
                "Secure Firewall (FMC) uses pxGrid for identity-based rules",
                "ANC policies (Quarantine, Port Bounce, Shutdown) trigger CoA",
                "Approve pxGrid clients and trust their certificates"
              ]
            },
            {
              t: "Device administration with TACACS+",
              body: "With the Device Admin license, PSNs act as TACACS+ servers (TCP 49) for network engineers' logins. TACACS+ encrypts the whole payload and authorises each command separately. Shell profiles set the privilege level, and command sets allow or deny individual commands, with full accounting of who typed what.",
              points: [
                "Enable Device Admin Service on the PSN persona",
                "Keep a local fallback account in case AAA is unreachable",
                "Device admin policy sets are separate from network access policy sets"
              ],
              cli: "tacacs server ISE-PSN1\n address ipv4 10.10.10.21\n key <secret>\naaa group server tacacs+ ISE-TAC\n server name ISE-PSN1\naaa authentication login VTY group ISE-TAC local\naaa authorization commands 15 VTY group ISE-TAC local\naaa accounting commands 15 VTY start-stop group ISE-TAC"
            }
          ]
        }
      ],
      quiz: [
        { q: "Which ISE persona processes RADIUS requests from switches?", o: ["PAN", "MnT", "PSN", "pxGrid"], a: 2, why: "Policy Service Nodes run the AAA runtime." },
        { q: "Which ISE persona is used to configure policy?", o: ["PSN", "PAN", "MnT", "IPN"], a: 1, why: "The Policy Administration Node holds the configuration database." },
        { q: "MAB is used for…", o: ["Admin logins", "Devices without an 802.1X supplicant", "Posture", "Guest sponsors"], a: 1, why: "MAC Authentication Bypass uses the MAC as the identity." },
        { q: "What lets ISE re-authenticate an existing session after a posture change?", o: ["SXP", "CoA", "SNMP trap", "OCSP"], a: 1, why: "Change of Authorization (RFC 5176)." },
        { q: "Which rollout mode authenticates but does not enforce?", o: ["Closed mode", "Low-impact mode", "Monitor (open) mode", "Critical mode"], a: 2, why: "Monitor mode lets you fix failures safely." },
        { q: "SXP carries…", o: ["RADIUS attributes", "IP-to-SGT mappings", "Syslog", "Posture results"], a: 1, why: "SGT Exchange Protocol propagates bindings where inline tagging isn't possible." },
        { q: "Device administration AAA in ISE uses…", o: ["RADIUS 1812", "TACACS+ TCP 49", "LDAP 389", "Kerberos 88"], a: 1, why: "TACACS+ with per-command authorisation." },
        { q: "Which ISE certificate do supplicants see during PEAP/EAP-TLS?", o: ["Admin", "Portal", "EAP Authentication", "pxGrid"], a: 2, why: "The EAP certificate is presented inside the TLS tunnel." }
      ]
    },
    {
      id: "datacenter",
      name: "Data Centre",
      short: "Data Centre",
      color: "#3DDC97",
      layers: "L2–L3",
      proto: "VXLAN · EVPN",
      level: "Advanced",
      hours: 14,
      topo: "spineleaf",
      tagline: "Spine-leaf fabrics, VXLAN/EVPN overlays, ACI and storage networking.",
      modules: [
        {
          title: "Fabric Design",
          lessons: [
            {
              t: "Spine-leaf (Clos) architecture",
              body: "Every leaf connects to every spine, so any two servers are exactly two hops apart. ECMP across the spines uses every link at once. To add capacity, add spines; to add ports, add leaves.",
              points: [
                "Replaces 3-tier core/aggregation/access for east-west traffic",
                "Underlay: eBGP or OSPF/IS-IS with /31 links",
                "Oversubscription ratio = server bandwidth ÷ uplink bandwidth (3:1 is common)"
              ]
            },
            {
              t: "Server connectivity",
              body: "Servers dual-home to a pair of leaves using MLAG or vPC, or EVPN multihoming (ESI), so a single leaf failure costs no connectivity. 25/100G to the server and 400G+ between spines is now standard.",
              points: [
                "vPC peer-link and keepalive design",
                "EVPN ESI removes the MLAG peer-link",
                "Top-of-rack vs end-of-row cabling"
              ]
            }
          ]
        },
        {
          title: "VXLAN & EVPN",
          lessons: [
            {
              t: "VXLAN overlay",
              body: "VXLAN wraps Layer 2 frames in UDP (port 4789) so Layer 2 segments can stretch across a routed fabric. A 24-bit VNI allows 16 million segments. VTEPs on the leaves encapsulate and decapsulate traffic.",
              points: [
                "Adds 50 bytes of overhead, so raise the underlay MTU to 9216",
                "Flood-and-learn uses multicast or ingress replication",
                "L2VNI = bridging, L3VNI = routing between VNIs"
              ]
            },
            {
              t: "BGP EVPN control plane",
              body: "EVPN (MP-BGP, AFI 25 / SAFI 70) advertises MAC and IP bindings, so VTEPs learn endpoints from the control plane rather than by flooding. A distributed anycast gateway puts the same gateway IP and MAC on every leaf.",
              points: [
                "Route type 2 = MAC/IP, type 3 = IMET (BUM handling), type 5 = IP prefix",
                "ARP suppression reduces flooding",
                "Symmetric IRB for inter-VNI routing"
              ],
              cli: "interface nve1\n source-interface loopback1\n host-reachability protocol bgp\n member vni 10020\n  ingress-replication protocol bgp"
            }
          ]
        },
        {
          title: "SDN & Storage",
          lessons: [
            {
              t: "Cisco ACI & intent-based fabrics",
              body: "In ACI, the APIC controller programs the fabric from policy: tenants, VRFs, bridge domains, EPGs and contracts. Traffic between EPGs is denied unless a contract allows it. The Cisco ACI domain covers this in depth. Other intent-based fabrics include Arista CloudVision and Juniper Apstra.",
              points: [
                "EPG = group of endpoints with the same policy",
                "Contracts = provider/consumer rules",
                "Multi-Site / Multi-Pod for multiple DCs"
              ]
            },
            {
              t: "Storage networking",
              body: "Fibre Channel SANs use zoning and WWNs. iSCSI and NVMe-over-Fabrics (RoCEv2, TCP) run storage over Ethernet. Lossless Ethernet uses PFC and ECN to keep storage and AI traffic from dropping.",
              points: [
                "FCoE needs DCB (PFC, ETS)",
                "RoCEv2 is also the backbone of AI/GPU clusters",
                "Keep storage traffic in its own queues"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "VXLAN's default UDP port?", o: ["4789", "8472", "4500", "6081"], a: 0, why: "IANA assigned 4789. Linux historically used 8472; Geneve uses 6081." },
        { q: "How many segments can a 24-bit VNI address?", o: ["4,094", "65,535", "~16 million", "~4 billion"], a: 2, why: "2^24 ≈ 16.7 million." },
        { q: "EVPN route type 2 carries…", o: ["IP prefixes", "MAC/IP bindings", "Ethernet segments", "Multicast"], a: 1, why: "Type 2 = MAC/IP Advertisement." },
        { q: "In a spine-leaf fabric, how many hops between servers on different leaves?", o: ["1", "2 (leaf-spine-leaf)", "3", "Varies"], a: 1, why: "Every leaf is one hop from every spine." }
      ]
    },
    {
      id: "aci",
      name: "Cisco ACI Data Centre",
      short: "ACI",
      color: "#14B8A6",
      layers: "L2–L7",
      proto: "APIC · iVXLAN",
      level: "Advanced",
      deep: true,
      hours: 22,
      topo: "aci",
      tagline: "Deep dive into Application Centric Infrastructure: fabric discovery, the tenant model, access policies, contracts, L3Out, Multi-Pod/Multi-Site and automation.",
      modules: [
        {
          title: "Fabric Architecture",
          lessons: [
            {
              t: "APIC, spines and leaves",
              body: "ACI is Cisco's SDN fabric built from Nexus 9000 switches running in ACI mode, managed by an APIC cluster. The APIC is the single point of policy and management but sits outside the data path: if every APIC goes down, the fabric keeps forwarding. Endpoints and external devices connect only to leaves. Spines connect only to leaves, plus IPN/ISN links.",
              points: [
                "APIC cluster: 3 or more controllers for production; the database is sharded across them",
                "Leaf roles: compute, service, border leaf (L3Out) and remote leaf",
                "The APIC connects to leaves; the fabric forms automatically from the first leaf",
                "Policy model: declare intent once and the APIC renders it onto switches"
              ]
            },
            {
              t: "Fabric discovery and the infra underlay",
              body: "At initial setup you define the fabric name, the TEP address pool, the infra VLAN and the multicast GIPo pool. Switches are discovered through LLDP, registered with a node ID and name, and given TEP addresses by DHCP from the APIC. IS-IS is the underlay IGP between TEPs. COOP on the spines holds the endpoint database. MP-BGP with the spines as route reflectors distributes external routes.",
              points: [
                "TEP pool must not overlap anything else; size /16 for large fabrics",
                "The infra VLAN (e.g. 3967) must be free end to end, including on hypervisor uplinks",
                "Spine proxy: unknown unicast is sent to the spines, which look it up in COOP",
                "The data plane is iVXLAN, carrying the source EPG (pcTag) and policy bits in the header"
              ],
              cli: "acidiag fnvread\nacidiag avread\nshow isis adjacency detail vrf overlay-1\nshow coop internal info repo ep"
            }
          ]
        },
        {
          title: "Logical Model: Tenants to EPGs",
          lessons: [
            {
              t: "Tenant, VRF, bridge domain",
              body: "A tenant is an administrative and policy container. Common, infra and mgmt are built-in tenants. A VRF is a Layer 3 routing domain. A bridge domain (BD) is a Layer 2 flood domain tied to one VRF, and it holds the gateway subnets, which work as a distributed anycast gateway on every leaf where the BD is deployed.",
              points: [
                "BD settings: unicast routing, L2 unknown unicast (proxy/flood), ARP flooding, limit IP learning to subnet",
                "Subnet scope: private, advertised externally, shared between VRFs",
                "Objects in tenant common can be used by every tenant"
              ]
            },
            {
              t: "Application profiles and EPGs",
              body: "An Endpoint Group (EPG) is a set of endpoints with the same policy, for example web servers. Membership is set by VLAN on a port, by VMM port group, or by attributes (uSeg EPGs). EPGs sit inside application profiles and belong to one BD. By default, no traffic flows between EPGs without a contract: ACI is a whitelist model.",
              points: [
                "Traffic within one EPG is allowed by default (unless intra-EPG isolation is on)",
                "Endpoint Security Groups (ESGs) decouple security from BD/forwarding constructs",
                "Network-centric migration: one VLAN = one BD = one EPG as a starting point"
              ]
            },
            {
              t: "The management information tree",
              body: "Everything in ACI is a managed object (MO) in the Management Information Tree (MIT), addressable by a distinguished name (DN) and typed by class. For example, fvTenant is a tenant, fvBD a bridge domain, fvAEPg an EPG and vzBrCP a contract. The GUI, CLI and REST API all read and write the same objects.",
              points: [
                "DN example: uni/tn-PROD/ap-SHOP/epg-WEB",
                "Visore (object browser) and API Inspector show the exact API calls behind GUI clicks",
                "Faults, events and audit logs are MOs too"
              ],
              cli: "moquery -c fvTenant\nmoquery -c fvCEp -f 'fv.CEp.ip==\"10.1.1.10\"'\nshow endpoint ip 10.1.1.10"
            }
          ]
        },
        {
          title: "Access Policies",
          lessons: [
            {
              t: "The access policy chain",
              body: "Before an EPG can use a port, the port must be allowed to carry that VLAN. The chain: a VLAN pool is referenced by a domain (physical, VMM, L3 or L2 external). The domain is attached to an AAEP (Attachable Access Entity Profile). The AAEP is attached to an interface policy group. The policy group is selected by an interface profile, which is associated with a switch profile.",
              points: [
                "Policy group types: access port, port-channel, vPC",
                "Interface policies: link speed, CDP/LLDP, LACP, MCP, storm control",
                "Static VLAN pools for bare metal; dynamic pools for VMM",
                "Most 'EPG not deployed' faults are a broken link in this chain (F0467 invalid VLAN / path)"
              ]
            },
            {
              t: "Attaching endpoints: static ports and VMM",
              body: "Static port bindings map an EPG to a leaf port or vPC with an encapsulation VLAN. VMM integration connects the APIC to vCenter (or another platform). The APIC creates a distributed switch, and each EPG becomes a port group, with VLANs taken from the dynamic pool automatically.",
              points: [
                "Deployment immediacy: immediate vs on-demand (saves policy TCAM)",
                "vPC requires a vPC explicit protection group per leaf pair",
                "Encap VLANs are locally significant to each leaf"
              ]
            }
          ]
        },
        {
          title: "Contracts & Service Insertion",
          lessons: [
            {
              t: "Providers, consumers, subjects and filters",
              body: "A contract is a policy between a provider EPG (for example, a web EPG offering TCP 443) and a consumer EPG. Contracts contain subjects, which contain filters that match L2–L4 fields. The contract's scope (application profile, VRF, tenant or global) decides where it applies. Leaves render contracts into zoning rules in hardware TCAM.",
              points: [
                "Apply both directions / reverse filter ports for stateless return traffic",
                "vzAny represents every EPG in a VRF, which saves TCAM for shared services",
                "Preferred groups allow free communication inside a group",
                "Taboo contracts explicitly deny traffic"
              ],
              cli: "show zoning-rule scope <vrf-vnid>\nshow system internal policy-mgr stats\ncontract_parser.py"
            },
            {
              t: "Service graphs and PBR",
              body: "Service graphs insert L4–L7 devices, such as firewalls and load balancers, between consumer and provider. With Policy-Based Redirect (PBR), the leaves redirect matching traffic to the service device, so it doesn't have to be the default gateway. That makes selective firewalling of east-west traffic practical.",
              points: [
                "Unmanaged mode: ACI only handles network stitching",
                "PBR health tracking with IP SLA and resilient hashing",
                "Symmetric PBR keeps both directions on the same firewall"
              ]
            }
          ]
        },
        {
          title: "External Connectivity & Multi-Fabric",
          lessons: [
            {
              t: "L3Out and external EPGs",
              body: "An L3Out connects a VRF to outside routers through border leaves using static routes, OSPF, EIGRP or BGP. External routes are distributed inside the fabric with MP-BGP. External EPGs (l3extInstP) classify outside prefixes so that contracts can apply to them. BD subnets are advertised out by marking them 'advertised externally' and associating the L3Out.",
              points: [
                "External EPG subnet flags: external subnets for external EPG (classification), export/import route control",
                "Use SVIs on vPC for redundant router peering",
                "BFD and floating SVI options for fast convergence and VM routers"
              ]
            },
            {
              t: "Multi-Pod, Multi-Site and remote leaf",
              body: "Multi-Pod extends one fabric (a single APIC cluster, one availability zone) across pods through an IP Inter-Pod Network (IPN) that needs PIM Bidir, OSPF and DHCP relay. Multi-Site interconnects independent fabrics, each with its own APIC cluster, through an Inter-Site Network. Nexus Dashboard Orchestrator defines stretched or local policy across sites. Remote leaf extends ACI to small sites over a WAN.",
              points: [
                "Multi-Pod = one change domain; Multi-Site = separate fault and change domains",
                "The IPN needs an MTU large enough for VXLAN (9150+ is typical)",
                "Nexus Dashboard also hosts Insights and assurance apps"
              ]
            }
          ]
        },
        {
          title: "Automation & Operations",
          lessons: [
            {
              t: "REST API, Ansible and Terraform",
              body: "The APIC REST API accepts JSON or XML. You log in via aaaLogin, then POST objects to their DNs. The cisco.aci Ansible collection and the CiscoDevNet/aci Terraform provider wrap the API for infrastructure as code, so tenants become version-controlled files.",
              points: [
                "Query with ?query-target=subtree&target-subtree-class=fvAEPg",
                "Snapshots and config rollback before large changes",
                "Use the API Inspector to turn GUI actions into code"
              ],
              cli: "POST https://apic/api/mo/uni.json\n{\"fvTenant\": {\"attributes\": {\"name\": \"PROD\"},\n  \"children\": [{\"fvCtx\": {\"attributes\": {\"name\": \"VRF1\"}}}]}}"
            },
            {
              t: "Troubleshooting toolkit",
              body: "Start with faults, which are graded by severity and point at the failing MO. Then check endpoint learning (show endpoint, the Endpoint Tracker), zoning rules for contracts, and ELAM or Visibility & Troubleshooting for packet paths. Atomic counters and SPAN/ERSPAN help with drops.",
              points: [
                "Health scores roll up from switches to tenants and applications",
                "Endpoint flapping often means a duplicate IP or a looped host",
                "Check policy CAM usage before adding many contracts"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "If all APICs fail, the ACI fabric…", o: ["Stops forwarding", "Keeps forwarding with the last policy", "Floods everything", "Reboots"], a: 1, why: "APIC is not in the data path." },
        { q: "Which object holds gateway subnets in ACI?", o: ["VRF", "EPG", "Bridge domain", "AAEP"], a: 2, why: "Subnets are configured on the BD (anycast gateway)." },
        { q: "By default, traffic between two EPGs is…", o: ["Permitted", "Denied without a contract", "Permitted only in the same BD", "Mirrored"], a: 1, why: "ACI is allow-list by default." },
        { q: "Correct access policy chain order?", o: ["VLAN pool → domain → AAEP → policy group → interface profile → switch profile", "AAEP → VLAN pool → EPG → BD", "Switch profile → VRF → BD", "Domain → tenant → contract"], a: 0, why: "That chain authorises VLANs on ports." },
        { q: "Which protocol stores the endpoint database on spines?", o: ["IS-IS", "COOP", "MP-BGP", "LLDP"], a: 1, why: "Council of Oracle Protocol." },
        { q: "What does vzAny represent?", o: ["All tenants", "All EPGs in a VRF", "All leaves", "Any external route"], a: 1, why: "vzAny = every EPG in the VRF." },
        { q: "Separate APIC clusters per fabric, orchestrated together, describes…", o: ["Multi-Pod", "Multi-Site", "Remote leaf", "vPC"], a: 1, why: "Multi-Site with Nexus Dashboard Orchestrator." },
        { q: "Which object classifies outside prefixes for contracts on an L3Out?", o: ["BD subnet", "External EPG (l3extInstP)", "AAEP", "Filter"], a: 1, why: "External EPG subnets classify external traffic." }
      ]
    },
    {
      id: "sdwan",
      name: "SD-WAN Concepts",
      short: "SD-WAN",
      color: "#FF9F5A",
      layers: "L3–L7",
      proto: "OMP · IPsec",
      level: "Advanced",
      deep: true,
      hours: 20,
      topo: "hubspoke",
      tagline: "Deep dive into Cisco Catalyst SD-WAN: control plane, OMP, TLOCs, onboarding, policy, app-aware routing, security and multicloud.",
      modules: [
        {
          title: "Why SD-WAN & the Four Planes",
          lessons: [
            {
              t: "From router-by-router WAN to SD-WAN",
              body: "A traditional WAN is configured box by box, depends on expensive MPLS, and backhauls Internet traffic through the data centre. SD-WAN abstracts every transport into one encrypted overlay. A central controller and policy engine decide per application which path to use, and new sites come up by zero-touch provisioning.",
              points: [
                "Transport independence: MPLS, broadband, LTE/5G and satellite all become 'colours' in one fabric",
                "Central policy replaces thousands of lines of per-device CLI",
                "Application-aware steering is based on measured loss, latency and jitter",
                "Direct Internet and SaaS access from the branch, with security built in"
              ]
            },
            {
              t: "Orchestration, management, control and data planes",
              body: "Cisco Catalyst SD-WAN (formerly Viptela) splits the solution into four planes. The SD-WAN Validator (vBond) handles orchestration: it authenticates every device and helps with NAT traversal. The SD-WAN Manager (vManage) is the management plane: GUI, templates or configuration groups, monitoring and APIs. The SD-WAN Controller (vSmart) is the control plane: it runs OMP and distributes routes, keys and policy. WAN Edge routers (cEdge on IOS XE, legacy vEdge) form the data plane.",
              points: [
                "Validator: first point of contact, needs a public IP or 1:1 NAT, UDP 12346",
                "Controllers and Manager hold permanent DTLS (default) or TLS sessions to every edge",
                "Controllers never forward user traffic; they only exchange control information",
                "All components authenticate with certificates plus an authorised serial-number list"
              ]
            },
            {
              t: "Bring-up sequence of a WAN Edge",
              body: "A new edge contacts the Validator over DTLS. The Validator checks the edge's certificate and serial number against the authorised list, then tells it the addresses of the Manager and Controllers. The edge builds control connections to them. The Manager pushes configuration, the Controllers send OMP routes, TLOCs and IPsec keys, and the edge builds BFD-monitored IPsec tunnels to the other edges.",
              points: [
                "Validator connections are transient; Manager and Controller sessions are permanent",
                "Organisation name, Validator address, system IP and site ID must be correct, or authentication fails",
                "Clock skew breaks certificate validation, so configure NTP early"
              ],
              cli: "show sdwan control local-properties\nshow sdwan control connections\nshow sdwan control connection-history"
            }
          ]
        },
        {
          title: "Overlay Building Blocks",
          lessons: [
            {
              t: "System IP, site ID and VPN segmentation",
              body: "Every device has a system IP (a router-ID-like identifier on the system/loopback interface) and a site ID that groups devices at the same location. Segmentation uses VPNs, which are VRFs. VPN 0 is the transport VPN facing the WAN, VPN 512 is out-of-band management, and service VPNs (1–511 and beyond) carry user traffic end to end.",
              points: [
                "The system IP does not need to be routable; it is only an identifier",
                "Site ID drives policy (site lists) and loop prevention",
                "Service VPN labels travel in OMP so segments stay separate across the fabric"
              ]
            },
            {
              t: "TLOCs and colours",
              body: "A TLOC (Transport Locator) identifies a WAN attachment point: system IP + colour + encapsulation (IPsec or GRE). Colours label transports. Private colours (mpls, metro-ethernet, private1–6) build tunnels using private addresses. Public colours (biz-internet, public-internet, lte, 3g, gold, silver…) use the post-NAT public address.",
              points: [
                "'restrict' on a colour builds tunnels only to TLOCs with the same colour",
                "TLOC extension lets two routers at a site share each other's circuits",
                "Carrier settings control whether private colours try public IPs between different carriers"
              ]
            },
            {
              t: "OMP: the Overlay Management Protocol",
              body: "OMP runs over the control connections, between edges and Controllers only, never edge to edge. It carries three route types: OMP routes (service-side prefixes learned from connected, static, OSPF, EIGRP or BGP), TLOC routes (transport locators with their attributes), and service routes (firewalls or IPS inserted in the path). Controllers act like BGP route reflectors and apply control policy before re-advertising.",
              points: [
                "Best-path tie-breakers include administrative distance, OMP preference and TLOC preference",
                "Default: up to 4 equal paths are installed (send-path-limit / ecmp-limit tunable)",
                "Graceful restart keeps forwarding if control connections drop (12 hours by default)"
              ],
              cli: "show sdwan omp peers\nshow sdwan omp routes vpn 10\nshow sdwan omp tlocs"
            },
            {
              t: "Data plane: IPsec without IKE",
              body: "Edges do not run IKE with each other. Each edge generates its own IPsec keys and sends them to the Controllers, which pass them to the other edges in OMP TLOC updates. This lets full-mesh encryption scale to thousands of sites. BFD runs inside every tunnel to detect failures and measure loss, latency and jitter.",
              points: [
                "Keys rekey on a timer (1 day by default) with a grace period",
                "Pairwise keys give each edge pair its own key",
                "Anti-replay window matters with QoS reordering"
              ],
              cli: "show sdwan bfd sessions\nshow sdwan ipsec outbound-connections\nshow sdwan tunnel statistics"
            }
          ]
        },
        {
          title: "Onboarding & Configuration",
          lessons: [
            {
              t: "Zero-touch provisioning (PnP)",
              body: "A factory-fresh edge gets an address by DHCP on its WAN port and contacts the Cisco Plug and Play Connect cloud. PnP maps its serial number to your organisation and Validator. The device joins the fabric and the Manager pushes the attached configuration. Staff at the branch only cable and power it on.",
              points: [
                "The device must be in the Smart Account's PnP portal and synced to the Manager",
                "Bootstrap files on USB or bootflash handle sites with no DHCP or Internet",
                "Certificates come from Cisco's CA, an enterprise CA or the Manager's own CA"
              ]
            },
            {
              t: "Templates and configuration groups",
              body: "Feature templates build device templates from reusable parts (system, VPN, interface, OMP, BFD). Newer releases replace them with configuration groups and feature profiles. Variables such as hostname, system IP and interface addresses are filled in per device, so one design can serve hundreds of branches.",
              points: [
                "CLI add-on templates cover features the GUI doesn't support",
                "Use variables for everything site-specific",
                "Changes are pushed as a transaction and roll back if the device loses its control connections"
              ]
            }
          ]
        },
        {
          title: "Policy Framework",
          lessons: [
            {
              t: "Centralised control policy",
              body: "Control policy runs on the Controller and changes what OMP advertises. You can filter which sites see which TLOCs to build hub-and-spoke or regional topologies, prefer a data centre, or insert a service such as a firewall. It affects routing information, not packets directly.",
              points: [
                "Match: site lists, prefix lists, TLOCs, VPNs; action: accept/reject, set preference or TLOC",
                "Direction 'out' toward sites is the most common",
                "Hub-and-spoke: advertise only hub TLOCs to spokes"
              ]
            },
            {
              t: "Centralised data policy & app-aware routing",
              body: "Data policy is written on the Controller, pushed to edges and enforced per packet or flow. It covers traffic steering, NAT/DIA, FEC, packet duplication and service chaining. App-aware routing (AAR) uses SLA classes. When BFD shows a tunnel breaking the voice SLA, voice flows move to a compliant colour.",
              points: [
                "SLA class example: loss 1%, latency 150 ms, jitter 30 ms",
                "Preferred colours, and a fallback action when no path meets the SLA",
                "BFD app-route polling interval and multiplier set how fast AAR reacts"
              ],
              cli: "show sdwan app-route stats\nshow sdwan policy from-vsmart\nshow sdwan policy app-route-policy-filter"
            },
            {
              t: "Localised policy & QoS",
              body: "Localised policy is configured on the device: ACLs, QoS maps, route policies for the service-side IGP/BGP, and mirroring. A QoS map defines up to 8 queues, with queue 0 as the low-latency queue. Shaping on Internet transports matches the real circuit speed.",
              points: [
                "Centralised = overlay-wide behaviour, localised = per-box behaviour",
                "Per-tunnel QoS avoids overrunning small spoke circuits",
                "Test the policy preview before activation"
              ]
            }
          ]
        },
        {
          title: "Security, Cloud & Scale",
          lessons: [
            {
              t: "Embedded security & SIG",
              body: "WAN Edges can run an enterprise firewall with application awareness, Snort-based IPS, URL filtering, advanced malware protection and DNS security. Or they can send Internet traffic through IPsec/GRE tunnels to a Secure Internet Gateway such as Cisco Umbrella or Zscaler. This is the edge half of SASE.",
              points: [
                "Security policies bind to zones built from service VPNs",
                "UTD container needs enough memory on the platform",
                "SIG tunnels support active/backup and weighted load-sharing"
              ]
            },
            {
              t: "Cloud OnRamp for SaaS and multicloud",
              body: "Cloud OnRamp for SaaS probes applications such as Microsoft 365 from every exit (local DIA or a gateway site) and picks the best exit for each app. Cloud OnRamp for Multicloud automates transit gateways and virtual edges in AWS, Azure and GCP, and interconnects through colocation partners.",
              points: [
                "vQoE score blends loss and latency per SaaS application",
                "Microsoft 365 traffic categories: Optimize / Allow / Default",
                "Watch cloud egress costs when steering traffic"
              ]
            },
            {
              t: "Multi-Region Fabric, HA and troubleshooting",
              body: "Multi-Region Fabric (MRF) splits a global overlay into regions joined by a core of border routers, so regional edges don't mesh globally. For HA, run multiple Controllers and Validators, dual edges per site with VRRP or TLOC extension, and affinity groups to pin edges to specific Controllers.",
              points: [
                "Most onboarding failures come from certificates, serial numbers, the organisation name or clock",
                "Use real-time device views and Simulate Flows in the Manager",
                "The same ideas appear on other platforms: Fortinet, Palo Alto Prisma SD-WAN, HPE Aruba EdgeConnect, VeloCloud"
              ],
              cli: "show sdwan control connections\nshow sdwan bfd sessions\nshow sdwan app-route sla-class\nshow sdwan omp routes detail"
            }
          ]
        }
      ],
      quiz: [
        { q: "Which Cisco SD-WAN component orchestrates authentication and NAT traversal?", o: ["SD-WAN Manager", "SD-WAN Validator (vBond)", "SD-WAN Controller (vSmart)", "WAN Edge"], a: 1, why: "The Validator is the first point of contact and orchestrates the join process." },
        { q: "OMP sessions run between…", o: ["Every pair of edges", "Edges and Controllers", "Edges and the Validator", "Manager and Validator only"], a: 1, why: "OMP runs only over control connections to the Controllers, which reflect routes." },
        { q: "A TLOC is made of…", o: ["Site ID + VPN", "System IP + colour + encapsulation", "Public IP + port", "Serial number + certificate"], a: 1, why: "TLOC = system IP, colour and encapsulation." },
        { q: "How do WAN Edges exchange IPsec keys?", o: ["IKEv2 between every pair", "Pre-shared keys", "Via the Controllers in OMP", "Via the Manager over NETCONF"], a: 2, why: "Controllers distribute each edge's keys, avoiding a full mesh of IKE." },
        { q: "Which VPN is the transport VPN?", o: ["VPN 0", "VPN 1", "VPN 512", "VPN 65530"], a: 0, why: "VPN 0 faces the WAN; VPN 512 is management." },
        { q: "Centralised control policy changes…", o: ["Packets on the edge", "OMP route/TLOC advertisements on the Controller", "Interface QoS", "Device certificates"], a: 1, why: "Control policy shapes what the Controller advertises." },
        { q: "What measures the SLA used by app-aware routing?", o: ["NetFlow", "BFD probes in each tunnel", "SNMP polling", "ICMP from the Manager"], a: 1, why: "BFD in each tunnel reports loss, latency and jitter." },
        { q: "The 'restrict' keyword on a colour means…", o: ["No DIA allowed", "Tunnels only form to TLOCs of the same colour", "The colour is private", "The TLOC is backup-only"], a: 1, why: "Restrict prevents tunnels to other colours." }
      ]
    },
    {
      id: "mpls",
      name: "MPLS & Service Provider",
      short: "MPLS",
      color: "#E57BD8",
      layers: "L2.5",
      proto: "LDP · SR",
      level: "Advanced",
      hours: 10,
      topo: "ring",
      tagline: "Label switching, L3VPNs, traffic engineering and Segment Routing in carrier networks.",
      modules: [
        {
          title: "Label Switching",
          lessons: [
            {
              t: "Labels, LSRs and LDP",
              body: "MPLS inserts a 32-bit shim header (20-bit label, TC, S, TTL) between Layer 2 and Layer 3. PE routers push labels, P routers swap them, and penultimate hop popping removes the top label one hop early. LDP distributes labels for IGP prefixes.",
              points: [
                "LFIB = label forwarding table",
                "Implicit null (label 3) triggers PHP",
                "LDP: UDP/TCP 646"
              ]
            }
          ]
        },
        {
          title: "MPLS VPNs",
          lessons: [
            {
              t: "L3VPN with VRFs",
              body: "Each customer gets a VRF on the PE. Route distinguishers make overlapping prefixes unique (VPNv4). Route targets control which VRFs import which routes. MP-BGP carries VPN routes along with an inner VPN label.",
              points: [
                "Two labels: transport (outer) + VPN (inner)",
                "RT import/export builds hub-spoke or extranets",
                "PE-CE: static, eBGP, OSPF or EIGRP"
              ],
              cli: "vrf definition CUST-A\n rd 65000:10\n address-family ipv4\n  route-target both 65000:10"
            },
            {
              t: "L2VPN: VPWS & VPLS / EVPN",
              body: "Pseudowires carry Ethernet point-to-point. VPLS emulates a multipoint LAN. EVPN is replacing VPLS with BGP-based MAC learning and all-active multihoming.",
              points: [
                "E-Line, E-LAN, E-Tree services (MEF)",
                "EVPN-VPWS for point-to-point",
                "Control-word and MTU considerations"
              ]
            }
          ]
        },
        {
          title: "Traffic Engineering",
          lessons: [
            {
              t: "RSVP-TE and Segment Routing",
              body: "Segment Routing encodes the path as a stack of segment IDs carried in the IGP, so there is no LDP and no RSVP state in the core. SR-TE policies steer traffic on constraints such as latency or disjointness. SRv6 carries segments in IPv6 extension headers.",
              points: [
                "Prefix-SID vs Adjacency-SID",
                "TI-LFA gives 50 ms fast reroute",
                "A PCE computes paths centrally"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "An MPLS label field is how many bits?", o: ["12", "16", "20", "32"], a: 2, why: "The label is 20 bits inside a 32-bit shim." },
        { q: "What makes overlapping customer prefixes unique in MP-BGP?", o: ["Route Target", "Route Distinguisher", "Community", "VRF name"], a: 1, why: "RD + IPv4 prefix = VPNv4 route." },
        { q: "Segment Routing removes the need for…", o: ["An IGP", "LDP/RSVP state", "BGP", "Labels"], a: 1, why: "The IGP distributes the SIDs itself." }
      ]
    },
    {
      id: "qos",
      name: "Quality of Service",
      short: "QoS",
      color: "#FFD166",
      layers: "L2–L3",
      proto: "DSCP",
      level: "Intermediate",
      hours: 6,
      topo: "layers",
      tagline: "Classification, marking, queuing and shaping so voice, video and critical apps get their share.",
      modules: [
        {
          title: "Classification & Marking",
          lessons: [
            {
              t: "DSCP, CoS and trust boundaries",
              body: "Mark traffic as close to the source as possible and trust markings only from devices you control. DSCP is a 6-bit field in the IP header; CoS is 3 bits in the 802.1Q tag.",
              points: [
                "EF (46) = voice, AF41 (34) = interactive video, CS3 (24) = signalling",
                "Default/BE = 0; scavenger CS1 = 8",
                "NBAR2 classifies by application"
              ]
            }
          ]
        },
        {
          title: "Queuing & Shaping",
          lessons: [
            {
              t: "LLQ / CBWFQ",
              body: "Class-based queues guarantee each class a share of bandwidth during congestion. The low-latency priority queue serves voice first but is policed so it cannot starve other traffic. WRED drops TCP early to avoid global synchronisation.",
              points: [
                "Keep priority traffic ≤ 33% of the link",
                "Queuing only matters when the link is congested",
                "Tail drop vs WRED"
              ],
              cli: "policy-map WAN-OUT\n class VOICE\n  priority percent 20\n class VIDEO\n  bandwidth percent 30\n class class-default\n  fair-queue"
            },
            {
              t: "Policing vs shaping",
              body: "Policing drops or re-marks traffic that exceeds the rate. Shaping buffers the excess and delays it. Shape toward a provider whose contracted rate is lower than the physical port, so the provider's policer never drops your traffic.",
              points: [
                "Token bucket: CIR, Bc, Be",
                "Hierarchical QoS: shape parent, queue child",
                "Voice budget: latency < 150 ms, jitter < 30 ms, loss < 1%"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "DSCP value for voice bearer traffic?", o: ["AF41", "CS3", "EF", "CS1"], a: 2, why: "Expedited Forwarding, decimal 46." },
        { q: "Shaping differs from policing because it…", o: ["Drops excess", "Buffers/delays excess", "Marks only", "Encrypts"], a: 1, why: "Shaping queues excess traffic instead of dropping it." },
        { q: "Where should the trust boundary be?", o: ["Core", "As close to the source as possible", "WAN edge only", "Firewall"], a: 1, why: "Classify and mark at the edge, at trusted devices." }
      ]
    },
    {
      id: "cloud",
      name: "Cloud Networking",
      short: "Cloud",
      color: "#62B6FF",
      layers: "L3–L7",
      proto: "VPC · TGW",
      level: "Intermediate",
      hours: 10,
      topo: "cloud",
      tagline: "VPCs/VNets, transit hubs, hybrid connectivity, load balancers and Kubernetes networking.",
      modules: [
        {
          title: "Virtual Networks",
          lessons: [
            {
              t: "VPC / VNet fundamentals",
              body: "A VPC (AWS/GCP) or VNet (Azure) is a private address space divided into subnets per availability zone. Route tables, Internet gateways and NAT gateways decide what can leave. Security groups are stateful; NACLs are stateless.",
              points: [
                "Plan non-overlapping CIDRs across clouds and on-prem",
                "Public subnet = route to an Internet gateway",
                "Private endpoints keep PaaS traffic off the Internet"
              ]
            },
            {
              t: "Transit & hub-spoke",
              body: "VPC peering is not transitive. At scale, use a Transit Gateway (AWS), Virtual WAN or a hub VNet (Azure), or Network Connectivity Center (GCP) to connect hundreds of VPCs, and inspect traffic centrally.",
              points: [
                "Centralised egress & inspection VPC",
                "Route table segmentation per environment",
                "Watch inter-AZ and egress data charges"
              ]
            }
          ]
        },
        {
          title: "Hybrid & Services",
          lessons: [
            {
              t: "Hybrid connectivity",
              body: "Site-to-site IPsec over the Internet is quick to set up. Dedicated circuits (Direct Connect, ExpressRoute, Cloud Interconnect) give predictable latency. BGP exchanges routes in both cases.",
              points: [
                "Use VPN as backup for the dedicated circuit",
                "Honour the cloud's prefix limits",
                "Use BFD for fast failover"
              ]
            },
            {
              t: "Load balancing & Kubernetes",
              body: "Layer 4 load balancers (NLB) pass through TCP and UDP. Layer 7 load balancers (ALB, App Gateway) route on host and path and terminate TLS. In Kubernetes, CNI plugins such as Calico and Cilium give each pod an IP, and Services and Ingress expose applications.",
              points: [
                "ClusterIP / NodePort / LoadBalancer services",
                "NetworkPolicy = pod-level firewall",
                "eBPF data planes replace kube-proxy iptables"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "Is AWS VPC peering transitive?", o: ["Yes", "No", "Only in one region", "Only with IPv6"], a: 1, why: "Use a Transit Gateway for transitive routing." },
        { q: "Security groups are…", o: ["Stateless", "Stateful", "Layer 7 only", "Applied to subnets only"], a: 1, why: "Return traffic is allowed automatically." },
        { q: "Which Kubernetes object restricts pod-to-pod traffic?", o: ["Service", "Ingress", "NetworkPolicy", "ConfigMap"], a: 2, why: "NetworkPolicy, enforced by the CNI." }
      ]
    },
    {
      id: "automation",
      name: "Network Automation",
      short: "Automation",
      color: "#A3E635",
      layers: "Mgmt",
      proto: "NETCONF · API",
      level: "Intermediate",
      hours: 12,
      topo: "star",
      tagline: "Python, Ansible, YANG, NETCONF/RESTCONF and CI/CD for infrastructure as code.",
      modules: [
        {
          title: "Programmability",
          lessons: [
            {
              t: "APIs, YANG and data formats",
              body: "YANG models describe device configuration and state as structured data. NETCONF (SSH 830) and RESTCONF (HTTPS) read and write those models, and gNMI streams telemetry over gRPC. JSON, XML and YAML are the common encodings.",
              points: [
                "NETCONF ops: get, get-config, edit-config, commit",
                "Candidate datastore + confirmed commit = safe changes",
                "OpenConfig = vendor-neutral models"
              ],
              cli: "curl -k -u admin \\\n  -H 'Accept: application/yang-data+json' \\\n  https://r1/restconf/data/ietf-interfaces:interfaces"
            },
            {
              t: "Python for network engineers",
              body: "Netmiko handles SSH/CLI sessions, NAPALM gives a common API across vendors, ncclient speaks NETCONF, and Nornir runs tasks in parallel. Parse show output with TextFSM, TTP or Genie.",
              points: [
                "Keep credentials in a vault, not in scripts",
                "Make scripts idempotent: check before change",
                "Jinja2 templates generate configs from data"
              ]
            }
          ]
        },
        {
          title: "Infrastructure as Code",
          lessons: [
            {
              t: "Ansible & Terraform",
              body: "Ansible is agentless and uses YAML playbooks and network modules. Terraform manages cloud and SDN resources declaratively with a state file. Store both in Git and review changes through pull requests.",
              points: [
                "Source of truth: NetBox / Nautobot",
                "Check mode / terraform plan before apply",
                "Roles and modules for reuse"
              ]
            },
            {
              t: "NetDevOps pipelines",
              body: "A CI/CD pipeline lints configs, tests them in a virtual lab (Containerlab, CML), runs pre- and post-change checks (pyATS, Batfish) and deploys with an automatic rollback.",
              points: [
                "Test before you touch production",
                "Intent verification with Batfish",
                "GitOps: the repo is the desired state"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "NETCONF runs over SSH on port…", o: ["22", "443", "830", "8080"], a: 2, why: "RFC 6242 assigns TCP 830." },
        { q: "Which language models network data for NETCONF/RESTCONF?", o: ["JSON", "YANG", "Jinja2", "TOML"], a: 1, why: "YANG is the modelling language; JSON/XML are encodings." },
        { q: "Which tool is agentless and uses YAML playbooks?", o: ["Puppet", "Chef", "Ansible", "SaltStack minion"], a: 2, why: "Ansible pushes over SSH/API without agents." }
      ]
    }
  ],

  paths: [
    { name: "Network Associate", note: "CCNA-level foundation", steps: ["fundamentals", "switching", "routing", "services", "wireless", "security", "automation"] },
    { name: "Enterprise & Campus", note: "CCNP ENCOR-style depth", steps: ["switching", "routing", "wireless", "mist", "qos", "sdwan", "ise"] },
    { name: "Data Centre & Cloud", note: "Fabrics to hyperscalers", steps: ["routing", "datacenter", "aci", "cloud", "automation"] },
    { name: "Identity & Zero Trust", note: "PKI, NAC and segmentation", steps: ["security", "pki", "ise", "sdwan", "cloud"] },
    { name: "AI-Driven Wireless Campus", note: "Wi-Fi to cloud-managed AIOps", steps: ["wireless", "pki", "ise", "mist"] },
    { name: "Service Provider", note: "Carrier-grade transport", steps: ["routing", "ipv6", "mpls", "qos"] },
    { name: "Security Engineer", note: "Defence in depth", steps: ["fundamentals", "dns", "security", "pki", "ise", "sdwan", "cloud"] }
  ]
};
