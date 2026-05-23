// src/app/api/test-tools/generate-leads/route.ts
/**
 * Test endpoint: generates N leads simultaneously to test concurrency.
 * NOT accessible from normal user UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProvidersToLead } from "@/lib/allocation";
import { broadcastLeadUpdate } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const { count = 10 } = await req.json();
    const n = Math.min(parseInt(count, 10), 50); // cap at 50

    const services = await prisma.service.findMany();
    if (services.length === 0) {
      return NextResponse.json({ error: "No services found. Run seed first." }, { status: 400 });
    }

    const timestamp = Date.now();

    // Fire all lead creations concurrently — this tests the serializable transaction
    const promises = Array.from({ length: n }, async (_, i) => {
      const service = services[i % services.length];
      const phone = `TEST${timestamp}${i}`;

      try {
        const lead = await prisma.lead.create({
          data: {
            name: `Test Customer ${i + 1}`,
            phone,
            city: "Test City",
            description: `Concurrency test lead #${i + 1}`,
            serviceId: service.id,
          },
        });

        const assignedIds = await assignProvidersToLead(lead.id, service.id);

        broadcastLeadUpdate({
          type: "NEW_LEAD",
          leadId: lead.id,
          serviceName: service.name,
          assignedProviders: assignedIds,
        });

        return { success: true, leadId: lead.id, assignedCount: assignedIds.length };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    });

    const results = await Promise.all(promises);
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ total: n, succeeded, failed, results });
  } catch (error) {
    console.error("[POST /api/test-tools/generate-leads]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
