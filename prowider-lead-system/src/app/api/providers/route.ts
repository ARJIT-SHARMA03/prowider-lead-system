// src/app/api/providers/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { id: "asc" },
      include: {
        leadAssignments: {
          include: {
            lead: {
              include: { service: true },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    const data = providers.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyQuota: p.monthlyQuota,
      currentMonthLeads: p.currentMonthLeads,
      remainingQuota: p.monthlyQuota - p.currentMonthLeads,
      leads: p.leadAssignments.map((a) => ({
        leadId: a.leadId,
        customerName: a.lead.name,
        phone: a.lead.phone,
        city: a.lead.city,
        service: a.lead.service.name,
        description: a.lead.description,
        assignedAt: a.assignedAt,
      })),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/providers]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
