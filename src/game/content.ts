export type GameMode =
  "campaign" | "arena" | "survival" | "horror" | "training";
export type Rule =
  | "elimination"
  | "team"
  | "ffa"
  | "domination"
  | "hardpoint"
  | "sabotage"
  | "capture"
  | "confirmed"
  | "arsenal"
  | "duel"
  | "infection"
  | "headquarters"
  | "defense"
  | "escort"
  | "stealth"
  | "boss"
  | "trial";
export type Mission = {
  id: number;
  name: string;
  location: string;
  environment: string;
  rule: Rule;
  target: number;
  color: string;
  briefing: string;
  radio: string;
  act: string;
};
export const missions: Mission[] = [
  {
    id: 0,
    name: "Dead Frequency",
    location: "NOVA CITY · SECTOR 07",
    environment: "city",
    rule: "elimination",
    target: 10,
    color: "#657c78",
    act: "I · THE SIGNAL",
    briefing:
      "The city went silent eleven minutes ago. Captain Sera Voss, your squad is the last unit outside the blackout. Enter the signal district, neutralize the occupying forces, and find out who is still transmitting.",
    radio:
      "LYRA: That signal isn’t a distress call, Sera. Someone is opening a door.",
  },
  {
    id: 1,
    name: "Glass Divide",
    location: "AUREL SPRAWL",
    environment: "city",
    rule: "capture",
    target: 3,
    color: "#7c8c9e",
    act: "I · THE SIGNAL",
    briefing:
      "Recover three encrypted relays from the broken financial quarter. The Directorate is listening. Bring the data home.",
    radio:
      "ROOK: Three relays. Three chances to learn what they did to this city.",
  },
  {
    id: 2,
    name: "Ghost Protocol",
    location: "KITE RESEARCH ANNEX",
    environment: "lab",
    rule: "stealth",
    target: 3,
    color: "#689793",
    act: "I · THE SIGNAL",
    briefing:
      "Infiltrate the annex and access its research terminals. Camouflage will hide you from patrols. Avoid unnecessary engagements.",
    radio:
      "LYRA: I worked here once. If the lights turn violet, do not trust your eyes.",
  },
  {
    id: 3,
    name: "Hold the Line",
    location: "OUTPOST CINDER",
    environment: "desert",
    rule: "defense",
    target: 45,
    color: "#b69b72",
    act: "I · THE SIGNAL",
    briefing:
      "Hold the evacuation transmitter against a Directorate assault for 45 seconds. Stay in the uplink perimeter to keep the channel alive.",
    radio:
      "ROOK: The last transport is inbound. We are not leaving these people.",
  },
  {
    id: 4,
    name: "Iron Rain",
    location: "MORROW FOUNDRY",
    environment: "industrial",
    rule: "sabotage",
    target: 3,
    color: "#a57f68",
    act: "II · FRACTURE",
    briefing:
      "Disable the foundry’s three power regulators. Expect armored resistance between the fabrication lines.",
    radio:
      "VOSS: They built an army here. Today we turn off the assembly line.",
  },
  {
    id: 5,
    name: "Whiteout",
    location: "PALE RIDGE",
    environment: "snow",
    rule: "escort",
    target: 60,
    color: "#b5cbd1",
    act: "II · FRACTURE",
    briefing:
      "Escort the autonomous medical crawler through Pale Ridge. Remain close to the beacon to advance its route.",
    radio:
      "ROOK: Visibility is nothing. Stay with the crawler. It knows the way.",
  },
  {
    id: 6,
    name: "Beneath the Skin",
    location: "THE UNDERTOW",
    environment: "lab",
    rule: "capture",
    target: 3,
    color: "#748470",
    act: "II · FRACTURE",
    briefing:
      "Collect living-memory samples from the underground facility. The custodians have been altered. They will not respond to warnings.",
    radio:
      "LYRA: Those voices… they are repeating the last thing they remember.",
  },
  {
    id: 7,
    name: "The Warden",
    location: "BASTION NINE",
    environment: "industrial",
    rule: "boss",
    target: 1,
    color: "#927964",
    act: "II · FRACTURE",
    briefing:
      "Confront Warden Kest, the Directorate’s armored enforcer. Clear the guard detail and breach his reinforced chassis.",
    radio: "KEST: You call this freedom, Voss? I call it another extinction.",
  },
  {
    id: 8,
    name: "Ash Gardens",
    location: "VERDANT EXCLUSION ZONE",
    environment: "forest",
    rule: "elimination",
    target: 16,
    color: "#6a8870",
    act: "III · RECKONING",
    briefing:
      "Clear the overgrown observation station. Adaptive hunters are using the forest as camouflage.",
    radio: "ROOK: The forest is moving. And I don’t mean the trees.",
  },
  {
    id: 9,
    name: "No Safe Harbor",
    location: "PORT SABLE",
    environment: "industrial",
    rule: "defense",
    target: 65,
    color: "#607f86",
    act: "III · RECKONING",
    briefing:
      "Keep the harbor communications tower online. Hold the marked perimeter until the resistance fleet receives your coordinates.",
    radio: "LYRA: The fleet heard us. Every second buys another ship.",
  },
  {
    id: 10,
    name: "Borrowed Faces",
    location: "DIRECTORATE ARCHIVE",
    environment: "lab",
    rule: "stealth",
    target: 4,
    color: "#8192a3",
    act: "III · RECKONING",
    briefing:
      "Infiltrate the archive and recover the civilian memory indexes from four terminals. Disruption will freeze hostile systems.",
    radio:
      "LYRA: My brother’s name is in this index. Sera, please bring it back.",
  },
  {
    id: 11,
    name: "Terminal Velocity",
    location: "SKYWAY SIX",
    environment: "city",
    rule: "escort",
    target: 75,
    color: "#af8d76",
    act: "III · RECKONING",
    briefing:
      "Guide the relay carrier across the exposed skyway. Fight through the ambushes and keep within its navigation field.",
    radio: "ROOK: Every gun in the district is pointed up here. Keep moving!",
  },
  {
    id: 12,
    name: "The Hollow Sun",
    location: "HELION REACTOR",
    environment: "desert",
    rule: "sabotage",
    target: 4,
    color: "#bd945f",
    act: "IV · AFTERLIGHT",
    briefing:
      "Overload four reactor junctions before the Helion weapon reaches ignition. Use cover to cross the furnace yard.",
    radio: "VOSS: The Directorate wanted a new sun. Let’s give them darkness.",
  },
  {
    id: 13,
    name: "A Thousand Voices",
    location: "CHORUS VAULT",
    environment: "horror",
    rule: "capture",
    target: 5,
    color: "#935158",
    act: "IV · AFTERLIGHT",
    briefing:
      "Recover five memory cores from the Chorus vault. Each core contains a thousand lives suspended in the network.",
    radio:
      "LYRA: They are still in there. All of them. We can bring them back.",
  },
  {
    id: 14,
    name: "Last Light",
    location: "CROWN DEFENSE ARRAY",
    environment: "snow",
    rule: "defense",
    target: 90,
    color: "#9aafb8",
    act: "IV · AFTERLIGHT",
    briefing:
      "Hold the array while Lyra prepares the network release. This is the Directorate’s final counterattack.",
    radio:
      "ROOK: We started as four people on a dead channel. Listen to us now.",
  },
  {
    id: 15,
    name: "Veilbreak",
    location: "THE ORIGIN SPIRE",
    environment: "city",
    rule: "boss",
    target: 1,
    color: "#8c706c",
    act: "IV · AFTERLIGHT",
    briefing:
      "Defeat the Origin sentinel. Then choose the future: release the network’s memories, or destroy the system forever.",
    radio: "LYRA: No more orders, Sera. No more ghosts. This choice is yours.",
  },
];
export type Weapon = {
  id: string;
  name: string;
  class: string;
  damage: number;
  rate: number;
  mag: number;
  accuracy: number;
  range: number;
  description: string;
};
export const weapons: Weapon[] = [
  {
    id: "vxr",
    name: "VXR-7 SENTINEL",
    class: "ASSAULT RIFLE",
    damage: 32,
    rate: 0.12,
    mag: 30,
    accuracy: 78,
    range: 72,
    description:
      "Reliable. Adaptable. Uncompromising. The backbone of the Vanguard arsenal.",
  },
  {
    id: "kestrel",
    name: "K-9 KESTREL",
    class: "SUBMACHINE GUN",
    damage: 22,
    rate: 0.07,
    mag: 40,
    accuracy: 64,
    range: 40,
    description:
      "A close-quarters specialist with exceptional handling and rate of fire.",
  },
  {
    id: "obelisk",
    name: "OBELISK .50",
    class: "PRECISION RIFLE",
    damage: 110,
    rate: 0.85,
    mag: 6,
    accuracy: 98,
    range: 100,
    description:
      "One shot can change the operation. High-impact precision platform.",
  },
  {
    id: "breach",
    name: "BREACH-12",
    class: "SCATTERGUN",
    damage: 85,
    rate: 0.6,
    mag: 8,
    accuracy: 40,
    range: 25,
    description: "Devastating stopping power inside confined spaces.",
  },
  {
    id: "atlas",
    name: "ATLAS MG",
    class: "LIGHT MACHINE GUN",
    damage: 28,
    rate: 0.09,
    mag: 80,
    accuracy: 62,
    range: 80,
    description:
      "Heavy sustained fire for locking down a lane or holding the perimeter.",
  },
  {
    id: "arc",
    name: "ARC-6 LANCER",
    class: "ENERGY RIFLE",
    damage: 46,
    rate: 0.24,
    mag: 24,
    accuracy: 88,
    range: 85,
    description: "A focused pulse weapon tuned to penetrate synthetic armor.",
  },
  {
    id: "sidearm",
    name: "P-11 EMBER",
    class: "SIDEARM",
    damage: 38,
    rate: 0.25,
    mag: 14,
    accuracy: 76,
    range: 40,
    description: "Your last line of defense.",
  },
];
export const abilities = [
  {
    id: "scan",
    name: "PULSE SCAN",
    key: "Q",
    description:
      "Reveal hostile positions and disrupt targeting for 8 seconds.",
    cooldown: 18,
  },
  {
    id: "cloak",
    name: "GHOSTWEAVE",
    key: "Q",
    description:
      "Bend light around your armor. Enemies lose tracking for 8 seconds.",
    cooldown: 24,
  },
  {
    id: "disrupt",
    name: "BLACKOUT",
    key: "Q",
    description: "Disable enemy movement and weapons for 6 seconds.",
    cooldown: 26,
  },
  {
    id: "shield",
    name: "AEGIS FIELD",
    key: "Q",
    description: "Restore armor and reduce incoming damage for 8 seconds.",
    cooldown: 22,
  },
  {
    id: "drone",
    name: "WINGMAN",
    key: "Q",
    description: "Deploy a combat drone that engages enemies for 12 seconds.",
    cooldown: 30,
  },
  {
    id: "boost",
    name: "OVERCLOCK",
    key: "Q",
    description: "Increase movement and weapon cycle speed for 8 seconds.",
    cooldown: 20,
  },
];
export const arenaModes: {
  name: string;
  rule: Rule;
  description: string;
  target: number;
}[] = [
  {
    name: "Team Deathmatch",
    rule: "team",
    description: "Squad versus squad. First to 20 eliminations.",
    target: 20,
  },
  {
    name: "Free-for-All",
    rule: "ffa",
    description: "Every operator for themselves. Secure 15 eliminations.",
    target: 15,
  },
  {
    name: "Domination",
    rule: "domination",
    description: "Capture three uplinks and hold territory to score.",
    target: 100,
  },
  {
    name: "Hardpoint",
    rule: "hardpoint",
    description: "Control the rotating zone. Reach 75 signal points.",
    target: 75,
  },
  {
    name: "Blackwire",
    rule: "sabotage",
    description: "Hack three enemy transmitters. Hold E at each terminal.",
    target: 3,
  },
  {
    name: "Core Capture",
    rule: "capture",
    description: "Recover three hostile data cores and return to extraction.",
    target: 3,
  },
  {
    name: "Echo Confirmed",
    rule: "confirmed",
    description: "Collect the identity echoes dropped by 12 defeated enemies.",
    target: 12,
  },
  {
    name: "Arsenal Run",
    rule: "arsenal",
    description: "Each elimination cycles your weapon. Master 12 encounters.",
    target: 12,
  },
  {
    name: "Gunfight",
    rule: "duel",
    description: "A tight six-elimination contest against elite opponents.",
    target: 6,
  },
  {
    name: "Infection",
    rule: "infection",
    description: "Survive for 90 seconds against relentless melee hunters.",
    target: 90,
  },
  {
    name: "Headquarters",
    rule: "headquarters",
    description: "Secure a relay and defend it for 60 seconds.",
    target: 60,
  },
];
export const arenas = [
  { name: "CINDER YARD", environment: "desert" },
  { name: "NOVA DISTRICT", environment: "city" },
  { name: "THE FOUNDRY", environment: "industrial" },
  { name: "PALE RIDGE", environment: "snow" },
  { name: "VERDANT", environment: "forest" },
  { name: "SUBLEVEL 09", environment: "horror" },
  { name: "COMBINE", environment: "desert" },
  { name: "AQUARIUM", environment: "aquarium" },
];
export const challenges = [
  {
    name: "First Contact",
    description: "Eliminate 10 hostile units.",
    stat: "kills",
    goal: 10,
    xp: 500,
  },
  {
    name: "Field Operative",
    description: "Complete 3 operations.",
    stat: "wins",
    goal: 3,
    xp: 1000,
  },
  {
    name: "Deadeye",
    description: "Land 15 precision headshots.",
    stat: "headshots",
    goal: 15,
    xp: 750,
  },
  {
    name: "No One Left Behind",
    description: "Complete 5 matches in any mode.",
    stat: "matches",
    goal: 5,
    xp: 1000,
  },
  {
    name: "Vanguard",
    description: "Earn 10,000 career XP.",
    stat: "xp",
    goal: 10000,
    xp: 1500,
  },
  {
    name: "Beyond the Veil",
    description: "Finish all 16 campaign operations.",
    stat: "campaign",
    goal: 16,
    xp: 5000,
  },
];
export type Profile = {
  xp: number;
  kills: number;
  headshots: number;
  wins: number;
  matches: number;
  completed: number[];
  claimed: string[];
  weapon: string;
  ability: string;
  attachments: Record<string, string>;
  callsign: string;
  ending?: string;
};
export const defaultProfile: Profile = {
  xp: 0,
  kills: 0,
  headshots: 0,
  wins: 0,
  matches: 0,
  completed: [],
  claimed: [],
  weapon: "vxr",
  ability: "scan",
  attachments: {
    optic: "Reflex",
    barrel: "Standard",
    magazine: "Standard",
    stock: "Balanced",
  },
  callsign: "NOMAD",
};
export type Settings = {
  volume: number;
  sensitivity: number;
  quality: string;
  difficulty: string;
  subtitles: boolean;
  shake: boolean;
  contrast: boolean;
  webModels: boolean;
};
export const defaultSettings: Settings = {
  volume: 40,
  sensitivity: 50,
  quality: "High",
  difficulty: "Regular",
  subtitles: true,
  shake: true,
  contrast: false,
  webModels: true,
};
export type MatchConfig = {
  mode: GameMode;
  rule: Rule;
  environment: string;
  target: number;
  mission: number;
  name: string;
  difficulty: string;
  weapon: string;
  ability: string;
  attachments: Record<string, string>;
  endless?: boolean;
};
export type MatchResult = {
  won: boolean;
  kills: number;
  headshots: number;
  xp: number;
  time: number;
  wave: number;
  mission: number;
  mode: GameMode;
  ending?: string;
};
