import { AgentWorker } from "@prospectai/agents";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.WORKER_SECRET ?? "prospectai-worker-secret-2025";

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overpassUrl = process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
  const worker = new AgentWorker(overpassUrl);
  const processed = await worker.processNext();

  return NextResponse.json({ processed });
}
