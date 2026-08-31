import { NextResponse } from "next/server";
import { listCustomers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listCustomers();
  return NextResponse.json(data);
}
