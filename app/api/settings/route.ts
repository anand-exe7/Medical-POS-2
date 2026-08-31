import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSettings();
  return NextResponse.json(data);
}
