// src/lib/allocation.ts
/**
 * Lead Distribution Logic
 *
 * Rules:
 * 1. Every lead gets exactly 3 provider assignments.
 * 2. Mandatory providers (by service) are always included first if under quota.
 * 3. Remaining slots are filled from the service's fair pool using round-robin
 *    (lowest fairPickCount among eligible providers with quota remaining).
 * 4. No provider can be assigned the same lead twice.
 * 5. Monthly quota (10) is respected — providers at quota are skipped.
 *
 * Concurrency:
 * - The entire allocation runs inside a serializable transaction with
 *   SELECT ... FOR UPDATE on the providers involved to prevent races.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

// ─── Config ──────────────────────────────────────────────────────────────────

const MANDATORY_ASSIGNMENTS: Record<number, number[]> = {
  // serviceId -> [mandatoryProviderIds]  (1-indexed provider IDs from seed)
  1: [1],       // Service 1 → Provider 1
  2: [5],       // Service 2 → Provider 5
  3: [1, 4],    // Service 3 → Provider 1 AND Provider 4
};

const FAIR_POOL: Record<number, number[]> = {
  // serviceId -> [eligible provider IDs for fair rotation]
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
};

const TOTAL_ASSIGNMENTS = 3;

// ─── Main function ────────────────────────────────────────────────────────────

export async function assignProvidersToLead(
  leadId: number,
  serviceId: number
): Promise<number[]> {
  return await prisma.$transaction(
    async (tx) => {
      // Lock all providers in this service's pools to prevent concurrent races
      const allRelevantProviderIds = [
        ...(MANDATORY_ASSIGNMENTS[serviceId] ?? []),
        ...(FAIR_POOL[serviceId] ?? []),
      ];

      // Lock rows for update (prevents concurrent allocation from picking the same provider)
      const providers = await tx.$queryRawUnsafe<
        Array<{
          id: number;
          name: string;
          monthly_quota: number;
          current_month_leads: number;
          fair_pick_count: number;
        }>
      >(
        `SELECT id, name, monthly_quota, current_month_leads, fair_pick_count
         FROM providers
         WHERE id = ANY($1::int[])
         ORDER BY id
         FOR UPDATE`,
        allRelevantProviderIds
      );

      const providerMap = new Map(providers.map((p) => [p.id, p]));
      const assigned: number[] = [];

      // Step 1: Assign mandatory providers (if under quota)
      const mandatoryIds = MANDATORY_ASSIGNMENTS[serviceId] ?? [];
      for (const pid of mandatoryIds) {
        if (assigned.length >= TOTAL_ASSIGNMENTS) break;
        const p = providerMap.get(pid);
        if (!p) continue;
        if (p.current_month_leads < p.monthly_quota) {
          assigned.push(pid);
        }
        // If mandatory provider is at quota, we skip them (soft degradation)
      }

      // Step 2: Fill remaining slots from fair pool
      const slotsNeeded = TOTAL_ASSIGNMENTS - assigned.length;
      if (slotsNeeded > 0) {
        const poolIds = FAIR_POOL[serviceId] ?? [];
        const eligible = poolIds
          .filter((pid) => {
            if (assigned.includes(pid)) return false;
            const p = providerMap.get(pid);
            if (!p) return false;
            return p.current_month_leads < p.monthly_quota;
          })
          .sort((a, b) => {
            const pa = providerMap.get(a)!;
            const pb = providerMap.get(b)!;
            // Round-robin: pick provider with the lowest fair_pick_count
            return pa.fair_pick_count - pb.fair_pick_count;
          });

        const picked = eligible.slice(0, slotsNeeded);
        assigned.push(...picked);
      }

      // Step 3: Persist assignments and update counters
      for (const pid of assigned) {
        await tx.leadAssignment.create({
          data: { leadId, providerId: pid },
        });

        const isMandatory = (MANDATORY_ASSIGNMENTS[serviceId] ?? []).includes(pid);

        await tx.$executeRaw`
          UPDATE providers
          SET
            current_month_leads = current_month_leads + 1,
            fair_pick_count = fair_pick_count + ${isMandatory ? 0 : 1}
          WHERE id = ${pid}
        `;
      }

      return assigned;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000,
    }
  );
}
