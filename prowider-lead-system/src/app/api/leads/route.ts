// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProvidersToLead } from "@/lib/allocation";
import { broadcastLeadUpdate } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, serviceId, description } = body;

    // Basic validation
    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const parsedServiceId = parseInt(serviceId, 10);
    if (isNaN(parsedServiceId)) {
      return NextResponse.json({ error: "Invalid serviceId." }, { status: 400 });
    }

    // Check service exists
    const service = await prisma.service.findUnique({
      where: { id: parsedServiceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    // Create lead (unique constraint on phone+serviceId handles duplicates at DB level)
    let lead;
    try {
      lead = await prisma.lead.create({
        data: {
          name,
          phone,
          city,
          description,
          serviceId: parsedServiceId,
        },
        include: { service: true },
      });
    } catch (err: unknown) {
      // Prisma unique constraint violation code
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate lead: this phone number already submitted a request for this service.",
          },
          { status: 409 }
        );
      }
      throw err;
    }

    // Assign providers
    const assignedProviderIds = await assignProvidersToLead(lead.id, parsedServiceId);

    // Fetch assignment details for response
    const assignments = await prisma.leadAssignment.findMany({
      where: { leadId: lead.id },
      include: { provider: true },
    });

    // Broadcast real-time update to dashboard listeners
    broadcastLeadUpdate({
      type: "NEW_LEAD",
      leadId: lead.id,
      serviceName: service.name,
      assignedProviders: assignments.map((a) => a.provider.name),
    });

    return NextResponse.json(
      {
        message: "Lead created and assigned successfully.",
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          city: lead.city,
          service: lead.service.name,
          description: lead.description,
          createdAt: lead.createdAt,
        },
        assignedProviders: assignments.map((a) => ({
          id: a.provider.id,
          name: a.provider.name,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/leads]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
