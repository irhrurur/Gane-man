import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { operators, matchRecords } from "@/db/schema";
import {
  defaultProfile,
  weapons,
  abilities,
  challenges,
  type MatchResult,
} from "@/game/content";
import { reward } from "@/game/rules";
export const dynamic = "force-dynamic";
async function identity() {
  const jar = await cookies();
  let id = jar.get("veilbreak_operator")?.value;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    jar.set("veilbreak_operator", id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
  }
  await db
    .insert(operators)
    .values({ id, profile: defaultProfile })
    .onConflictDoNothing();
  return id;
}
export async function GET() {
  try {
    const id = await identity();
    const [row] = await db.select().from(operators).where(eq(operators.id, id));
    const records = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.operatorId, id))
      .orderBy(desc(matchRecords.createdAt))
      .limit(12);
    return NextResponse.json({ profile: row.profile, records });
  } catch (error) {
    console.error("Profile load failed", error);
    return NextResponse.json(
      {
        error:
          "Career service is temporarily unavailable. Local progress is preserved.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const id = await identity();
    const body = await request.json();
    const profile = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(operators)
        .where(eq(operators.id, id))
        .for("update");
      const p = { ...defaultProfile, ...row.profile };
      if (body.action === "loadout") {
        if (weapons.some((w) => w.id === body.weapon)) p.weapon = body.weapon;
        if (abilities.some((a) => a.id === body.ability))
          p.ability = body.ability;
        if (typeof body.callsign === "string")
          p.callsign =
            body.callsign
              .replace(/[^a-zA-Z0-9 _-]/g, "")
              .slice(0, 16)
              .toUpperCase() || "NOMAD";
        if (body.attachments && typeof body.attachments === "object") {
          const options: Record<string, string[]> = {
            optic: ["Reflex", "Iron sights", "Scope"],
            barrel: ["Standard", "Precision", "Suppressed"],
            magazine: ["Standard", "Extended"],
            stock: ["Balanced", "Lightweight"],
          };
          for (const k of Object.keys(options)) {
            if (options[k].includes(body.attachments[k]))
              p.attachments = { ...p.attachments, [k]: body.attachments[k] };
          }
        }
      } else if (body.action === "claim") {
        const c = challenges.find((c) => c.name === body.name);
        if (!c) throw new Error("Unknown challenge");
        const value =
          c.stat === "campaign"
            ? p.completed.length
            : Number(p[c.stat as keyof typeof p]) || 0;
        if (value < c.goal || p.claimed.includes(c.name))
          throw new Error("Challenge is not claimable");
        p.xp += c.xp;
        p.claimed = [...p.claimed, c.name];
      } else if (body.action === "finish") {
        const r = body.result as MatchResult;
        if (
          !r ||
          !["campaign", "arena", "survival", "horror", "training"].includes(
            r.mode,
          )
        )
          throw new Error("Invalid match");
        const num = (v: number, max: number) =>
          Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
        const kills = num(r.kills, 10000),
          heads = Math.min(kills, num(r.headshots, 10000)),
          wave = num(r.wave, 999),
          mission = num(r.mission, 15),
          won = r.won === true,
          xp = reward(kills, heads, won, wave);
        p.xp += xp;
        p.kills += kills;
        p.headshots += heads;
        p.matches++;
        if (won) p.wins++;
        if (won && r.mode === "campaign" && !p.completed.includes(mission))
          p.completed = [...p.completed, mission];
        if (r.ending === "release" || r.ending === "destroy")
          p.ending = r.ending;
        await tx
          .insert(matchRecords)
          .values({
            operatorId: id,
            callsign: p.callsign,
            mode: r.mode,
            mission,
            kills,
            xp,
            wave,
            duration: num(r.time, 86400),
            outcome: won ? "VICTORY" : "KIA",
          });
      } else throw new Error("Unknown action");
      await tx
        .update(operators)
        .set({ profile: p, updatedAt: new Date() })
        .where(eq(operators.id, id));
      return p;
    });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Career update failed", error);
    return NextResponse.json(
      { error: "Unable to save career update." },
      { status: 400 },
    );
  }
}
