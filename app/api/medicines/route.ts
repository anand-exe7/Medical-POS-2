import { NextResponse } from "next/server";
import { listMedicines } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listMedicines();
  return NextResponse.json(data);
}
