import { NextResponse } from "next/server";
import { db } from "@/db";
import { matchRecords } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const records = await db
      .select({
        id: matchRecords.id,
        callsign: matchRecords.callsign,
        mode: matchRecords.mode,
        wave: matchRecords.wave,
        kills: matchRecords.kills,
        xp: matchRecords.xp,
      })
      .from(matchRecords)
      .where(inArray(matchRecords.mode, ["survival", "horror"]))
      .orderBy(desc(matchRecords.wave), desc(matchRecords.kills))
      .limit(20);
    return NextResponse.json({ records });
  } catch {
    return NextResponse.json(
      { error: "Leaderboard temporarily unavailable" },
      { status: 503 },
    );
  }
}
