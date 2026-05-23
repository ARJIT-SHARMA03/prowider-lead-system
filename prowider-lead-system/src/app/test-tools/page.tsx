"use client";
// src/app/test-tools/page.tsx

import Link from "next/link";
import { useState } from "react";

interface LogEntry {
  time: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function TestToolsPage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), type, message },
      ...prev,
    ]);
  };

  // Action 1: Reset all provider quotas via webhook (idempotency key changes each time)
  const handleResetQuota = async () => {
    setLoading("reset");
    const idempotencyKey = `quota-reset-${Date.now()}`;
    try {
      const res = await fetch("/api/webhook/reset-quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": idempotencyKey,
          "x-webhook-secret": process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "dev-secret",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        addLog("success", `✓ Quota reset: ${data.message} (key: ${idempotencyKey})`);
      } else {
        addLog("error", `✗ Error: ${data.error}`);
      }
    } catch {
      addLog("error", "✗ Network error.");
    } finally {
      setLoading(null);
    }
  };

  // Action 2: Call webhook multiple times with the SAME key (idempotency test)
  const handleIdempotencyTest = async () => {
    setLoading("idempotency");
    const sharedKey = `idempotency-test-${Math.floor(Date.now() / 10000)}`; // same key for ~10s
    addLog("info", `Testing idempotency with key: ${sharedKey}`);

    for (let i = 1; i <= 3; i++) {
      try {
        const res = await fetch("/api/webhook/reset-quota", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": sharedKey,
            "x-webhook-secret": process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "dev-secret",
          },
          body: JSON.stringify({ test: true }),
        });
        const data = await res.json();
        if (data.alreadyProcessed) {
          addLog("info", `  Call #${i}: Already processed (idempotent ✓)`);
        } else {
          addLog("success", `  Call #${i}: Processed successfully`);
        }
      } catch {
        addLog("error", `  Call #${i}: Network error`);
      }
    }
    setLoading(null);
  };

  // Action 3: Generate 10 leads simultaneously (concurrency test)
  const handleGenerateLeads = async () => {
    setLoading("generate");
    addLog("info", "Generating 10 leads concurrently...");
    try {
      const res = await fetch("/api/test-tools/generate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(
          "success",
          `✓ Done: ${data.succeeded} succeeded, ${data.failed} failed out of ${data.total} leads.`
        );
        if (data.failed > 0) {
          addLog("info", "Some failures may be expected due to quota limits.");
        }
      } else {
        addLog("error", `✗ ${data.error}`);
      }
    } catch {
      addLog("error", "✗ Network error.");
    } finally {
      setLoading(null);
    }
  };

  const clearLog = () => setLog([]);

  return (
    <>
      <nav>
        <span className="brand">Prowider</span>
        <Link href="/">Home</Link>
        <Link href="/request-service">Submit Request</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/test-tools">Test Tools</Link>
      </nav>
      <div className="container">
        <div className="page-header">
          <h1>🔧 Test Tools</h1>
          <p>
            Simulate webhooks, test idempotency, and stress-test concurrency.
            These tools are NOT accessible from the normal user flow.
          </p>
        </div>

        <div className="grid-2">
          <div className="card">
            <h2>Webhook Actions</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                className="btn btn-success"
                onClick={handleResetQuota}
                disabled={!!loading}
              >
                {loading === "reset" ? <span className="spinner" /> : "🔄"}
                Reset All Provider Quotas
              </button>
              <p style={{ fontSize: 12, color: "#718096", marginTop: -4 }}>
                Simulates a payment gateway confirming subscription renewal.
                Quota resets ONLY through this webhook endpoint.
              </p>

              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

              <button
                className="btn btn-orange"
                onClick={handleIdempotencyTest}
                disabled={!!loading}
              >
                {loading === "idempotency" ? <span className="spinner" /> : "🔁"}
                Call Webhook 3× Same Key
              </button>
              <p style={{ fontSize: 12, color: "#718096", marginTop: -4 }}>
                Fires the same webhook 3 times with an identical idempotency key.
                Only the first call should have any effect.
              </p>

              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

              <button
                className="btn btn-danger"
                onClick={handleGenerateLeads}
                disabled={!!loading}
              >
                {loading === "generate" ? <span className="spinner" /> : "⚡"}
                Generate 10 Leads Simultaneously
              </button>
              <p style={{ fontSize: 12, color: "#718096", marginTop: -4 }}>
                Creates 10 leads in parallel using Promise.all. Tests whether
                the serializable transaction prevents duplicate provider assignments.
              </p>
            </div>
          </div>

          <div className="card">
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
            >
              <h2 style={{ margin: 0 }}>Activity Log</h2>
              {log.length > 0 && (
                <button
                  className="btn"
                  style={{ padding: "4px 10px", fontSize: 12, background: "#e2e8f0", color: "#4a5568" }}
                  onClick={clearLog}
                >
                  Clear
                </button>
              )}
            </div>
            <div
              style={{
                background: "#1a202c",
                borderRadius: 8,
                padding: 16,
                minHeight: 200,
                maxHeight: 400,
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              {log.length === 0 ? (
                <span style={{ color: "#4a5568" }}>— No activity yet —</span>
              ) : (
                log.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      color:
                        entry.type === "success"
                          ? "#68d391"
                          : entry.type === "error"
                          ? "#fc8181"
                          : "#90cdf4",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "#4a5568" }}>[{entry.time}]</span>{" "}
                    {entry.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h2>What These Tests Verify</h2>
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Expected Behavior</th>
                <th>How It Works</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Reset Quota</td>
                <td>All providers reset to 0 leads used</td>
                <td>Webhook endpoint with new idempotency key each click</td>
              </tr>
              <tr>
                <td>Idempotency Test</td>
                <td>Only first call resets quota; calls 2 & 3 are no-ops</td>
                <td>WebhookEvent table stores seen idempotency keys</td>
              </tr>
              <tr>
                <td>Concurrent Leads</td>
                <td>No provider over-assigned; exactly 3 per lead</td>
                <td>Serializable transaction + SELECT FOR UPDATE locks providers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
