import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { tavilySearch } from "@/lib/providers/tavily";

const schema = z.object({ query: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text: query, userId: user.id, country });

    const results = await tavilySearch(query);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro na busca";
    return NextResponse.json({ error: message }, { status });
  }
}
