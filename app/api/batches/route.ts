import { NextResponse } from "next/server";
import { listBatchRows } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listBatchRows();
  return NextResponse.json(data);
}
