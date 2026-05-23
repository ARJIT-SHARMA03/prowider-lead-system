// src/app/api/webhook/reset-quota/route.ts
/**
 * Webhook: Reset provider quota
 *
 * This simulates a payment gateway confirming a provider's subscription renewal.
 *
 * Idempotency:
 * - Caller must provide an "Idempotency-Key" header.
 * - If we've seen this key before, we return 200 with the original result (no side effects).
 * - This prevents duplicate processing if the webhook is fired multiple times.
 *
 * Security:
 * - In production, validate a signature from the payment provider.
 * - Here we validate a shared secret (WEBHOOK_SECRET env var) as a simple guard.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Simple shared-secret auth (set WEBHOOK_SECRET in .env)
    const secret = req.headers.get("x-webhook-secret");
    if (
      process.env.WEBHOOK_SECRET &&
      secret !== process.env.WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Idempotency check
    const idempotencyKey = req.headers.get("idempotency-key");
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required." },
        { status: 400 }
      );
    }

    // Check if already processed
    const existing = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return NextResponse.json({
        message: "Already processed (idempotent).",
        alreadyProcessed: true,
        originalPayload: existing.payload,
        processedAt: existing.processedAt,
      });
    }

    const body = await req.json();
    const { providerId } = body;

    let resetCount = 0;

    if (providerId) {
      // Reset specific provider
      const id = parseInt(providerId, 10);
      await prisma.provider.update({
        where: { id },
        data: { currentMonthLeads: 0 },
      });
      resetCount = 1;
    } else {
      // Reset ALL providers (e.g., monthly billing cycle)
      const result = await prisma.provider.updateMany({
        data: { currentMonthLeads: 0 },
      });
      resetCount = result.count;
    }

    // Record idempotency key so re-firing has no effect
    await prisma.webhookEvent.create({
      data: {
        idempotencyKey,
        payload: body,
      },
    });

    return NextResponse.json({
      message: `Quota reset for ${resetCount} provider(s).`,
      resetCount,
      alreadyProcessed: false,
    });
  } catch (error) {
    console.error("[POST /api/webhook/reset-quota]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
