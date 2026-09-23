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
              body: "In ACI, the APIC controller programs the fabric from policy: tenants, VRFs, bridge domains, EPGs and contracts. Traffic between EPGs is denied unless a contract allows it. Other intent-based fabrics include Arista CloudVision and Juniper Apstra.",
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
      id: "sdwan",
      name: "SD-WAN",
      short: "SD-WAN",
      color: "#FF9F5A",
      layers: "L3–L7",
      proto: "Overlay",
      level: "Intermediate",
      hours: 10,
      topo: "hubspoke",
      tagline: "Transport-independent WANs with centralised policy, app-aware routing and cloud on-ramps.",
      modules: [
        {
          title: "Architecture",
          lessons: [
            {
              t: "Planes and components",
              body: "SD-WAN separates the planes. An orchestrator handles onboarding, a controller distributes routes and policy (in Cisco's design, vSmart over OMP), a manager provides the GUI and API, and edge routers build encrypted overlay tunnels over any transport.",
              points: [
                "Transports: MPLS, broadband, LTE/5G, satellite",
                "Zero-touch provisioning for new branches",
                "TLOC = transport locator (system IP + colour + encapsulation)"
              ]
            },
            {
              t: "Overlay tunnels & topologies",
              body: "Edges build an IPsec full mesh by default. Policy can restrict this to hub-and-spoke or regional meshes. BFD probes run through every tunnel to measure loss, latency and jitter all the time.",
              points: [
                "Full mesh vs hub-and-spoke vs partial mesh",
                "Segmentation with VPNs/VRFs end to end",
                "Direct Internet Access (DIA) at branches"
              ]
            }
          ]
        },
        {
          title: "Policy",
          lessons: [
            {
              t: "Application-aware routing",
              body: "DPI identifies thousands of applications. SLA classes define acceptable loss, latency and jitter. When a path breaks its SLA, flows move to a compliant path within seconds, so voice stays on the cleanest link.",
              points: [
                "Example SLA for voice: loss < 1%, latency < 150 ms, jitter < 30 ms",
                "FEC and packet duplication protect real-time traffic",
                "Cloud OnRamp probes SaaS reachability (M365, Salesforce)"
              ]
            },
            {
              t: "Security & SASE",
              body: "Branch edges now ship with an embedded firewall, IPS and URL filtering, or they forward Internet traffic to a cloud SSE service. Together, SD-WAN and SSE make up the SASE model.",
              points: [
                "Local breakout needs local security",
                "SSE: SWG + CASB + ZTNA + FWaaS",
                "Single-vendor vs dual-vendor SASE"
              ]
            }
          ]
        }
      ],
      quiz: [
        { q: "What continuously measures SD-WAN tunnel quality?", o: ["SNMP", "BFD probes", "Syslog", "ICMP only"], a: 1, why: "BFD runs inside each tunnel for loss, latency and jitter." },
        { q: "App-aware routing moves traffic when…", o: ["A link goes down only", "A path violates its SLA class", "Every 24 hours", "CPU is high"], a: 1, why: "It reacts to SLA breaches, not just outages." },
        { q: "SD-WAN + cloud-delivered security is called…", o: ["SASE", "SIEM", "SOAR", "NAC"], a: 0, why: "Secure Access Service Edge." }
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
    { name: "Enterprise & Campus", note: "CCNP ENCOR-style depth", steps: ["switching", "routing", "wireless", "qos", "sdwan", "security"] },
    { name: "Data Centre & Cloud", note: "Fabrics to hyperscalers", steps: ["routing", "datacenter", "cloud", "automation"] },
    { name: "Service Provider", note: "Carrier-grade transport", steps: ["routing", "ipv6", "mpls", "qos"] },
    { name: "Security Engineer", note: "Defence in depth", steps: ["fundamentals", "dns", "security", "sdwan", "cloud"] }
  ]
};
