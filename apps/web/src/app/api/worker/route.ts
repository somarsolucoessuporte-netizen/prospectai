import { AgentWorker } from "@prospectai/agents";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.WORKER_SECRET ?? "prospectai-worker-secret-2025";

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overpassUrl = process.env.OSM_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
  const groqApiKey = process.env.GROQ_API_KEY ?? "";
  const groqModel = process.env.GROQ_MODEL ?? "llama3-70b-8192";

  const worker = new AgentWorker(overpassUrl, groqApiKey, groqModel);
  const processed = await worker.processBatch();

  return NextResponse.json({ processed });
}
