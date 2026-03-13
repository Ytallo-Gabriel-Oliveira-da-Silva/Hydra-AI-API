import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const releases = await prisma.cliRelease.findMany({
      orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
      take: 12,
    });

    return NextResponse.json({
      releases: releases.map((release) => ({
        id: release.id,
        version: release.version,
        channel: release.channel,
        platform: release.platform,
        arch: release.arch,
        downloadUrl: safeUrl(release.downloadUrl),
        checksum: release.checksum,
        notes: release.notes,
        publishedAt: release.publishedAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar releases públicas";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}