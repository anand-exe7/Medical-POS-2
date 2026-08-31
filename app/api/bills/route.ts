import { NextResponse } from "next/server";
import { listBills } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listBills();
  return NextResponse.json(data);
}
