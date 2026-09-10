import type { Rule } from "./content";
export type MatchState = {
  kills: number;
  score: number;
  collected: number;
  elapsed: number;
  objectiveTime: number;
  bossDead: boolean;
  atExtraction: boolean;
  playerHealth: number;
};
export function isVictory(rule: Rule, target: number, s: MatchState): boolean {
  if (s.playerHealth <= 0) return false;
  if (rule === "boss") return s.bossDead;
  if (["capture", "stealth", "sabotage"].includes(rule))
    return s.collected >= target && (rule !== "capture" || s.atExtraction);
  if (
    ["defense", "escort", "hardpoint", "headquarters", "domination"].includes(
      rule,
    )
  )
    return s.objectiveTime >= target;
  if (rule === "infection") return s.elapsed >= target;
  if (rule === "confirmed") return s.collected >= target;
  if (rule === "trial") return s.kills >= target;
  return s.kills >= target;
}
export function reward(
  kills: number,
  headshots: number,
  won: boolean,
  wave: number,
) {
  return (
    Math.max(0, kills) * 100 +
    Math.max(0, headshots) * 50 +
    (won ? 750 : 100) +
    Math.max(0, wave - 1) * 150
  );
}
export function levelFor(xp: number) {
  return Math.floor(Math.max(0, xp) / 2500) + 1;
}
export function objectiveText(rule: Rule, target: number): string {
  const labels: Partial<Record<Rule, string>> = {
    capture: `Recover ${target} data cores · return to extraction`,
    stealth: `Infiltrate and access ${target} terminals [E]`,
    sabotage: `Disable ${target} power junctions [E]`,
    defense: `Hold the uplink for ${target} seconds`,
    escort: `Escort the crawler · stay near the beacon`,
    boss: "Destroy the armored sentinel",
    domination: "Capture uplinks · hold territory",
    hardpoint: "Control the rotating hardpoint",
    headquarters: "Secure and defend the headquarters",
    confirmed: `Collect ${target} hostile echoes`,
    infection: `Survive the infection for ${target} seconds`,
    arsenal: `Cycle the arsenal · ${target} eliminations`,
    trial: `Destroy ${target} targets as fast as possible`,
  };
  return labels[rule] || `Neutralize ${target} hostile operators`;
}
