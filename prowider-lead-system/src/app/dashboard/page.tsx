"use client";
// src/app/dashboard/page.tsx

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface Lead {
  leadId: number;
  customerName: string;
  phone: string;
  city: string;
  service: string;
  description: string;
  assignedAt: string;
}

interface Provider {
  id: number;
  name: string;
  monthlyQuota: number;
  currentMonthLeads: number;
  remainingQuota: number;
  leads: Lead[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();

    // SSE connection for real-time updates
    const es = new EventSource("/api/providers/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        JSON.parse(e.data); // validate
        setLastUpdate(new Date().toLocaleTimeString());
        fetchProviders(); // refresh data
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [fetchProviders]);

  const getQuotaColor = (used: number, total: number) => {
    const pct = used / total;
    if (pct >= 0.9) return "#e53e3e";
    if (pct >= 0.6) return "#dd6b20";
    return "#38a169";
  };

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
        <div
          className="page-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <div>
            <h1>Provider Dashboard</h1>
            <p>Live view of all providers, their quotas, and assigned leads.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="live-indicator">
              <span className="pulse" style={{ background: connected ? "#38a169" : "#e53e3e" }} />
              {connected ? "Live" : "Reconnecting..."}
            </div>
            {lastUpdate && (
              <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
                Last update: {lastUpdate}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="card empty-state">
            <div className="spinner" style={{ borderColor: "#cbd5e0", borderTopColor: "#3182ce" }} />
            <p>Loading providers...</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {providers.map((p) => {
                const pct = (p.currentMonthLeads / p.monthlyQuota) * 100;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      cursor: "pointer",
                      border:
                        expandedProvider === p.id
                          ? "2px solid #3182ce"
                          : "1px solid #e2e8f0",
                    }}
                    onClick={() =>
                      setExpandedProvider(expandedProvider === p.id ? null : p.id)
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <h3>{p.name}</h3>
                      <span
                        className="badge"
                        style={{
                          background:
                            p.remainingQuota === 0 ? "#fed7d7" : "#c6f6d5",
                          color: p.remainingQuota === 0 ? "#c53030" : "#276749",
                        }}
                      >
                        {p.leads.length} leads
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#4a5568", marginBottom: 8 }}>
                      {p.currentMonthLeads}/{p.monthlyQuota} quota used
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "#e2e8f0",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: getQuotaColor(p.currentMonthLeads, p.monthlyQuota),
                          borderRadius: 4,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    {p.remainingQuota === 0 && (
                      <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 6 }}>
                        ⚠ Quota reached
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expanded lead list */}
            {expandedProvider !== null && (() => {
              const p = providers.find((x) => x.id === expandedProvider);
              if (!p) return null;
              return (
                <div className="card">
                  <h2>{p.name} — Assigned Leads</h2>
                  {p.leads.length === 0 ? (
                    <div className="empty-state">
                      <p>No leads assigned yet.</p>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Customer</th>
                          <th>Phone</th>
                          <th>City</th>
                          <th>Service</th>
                          <th>Description</th>
                          <th>Assigned At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.leads.map((lead) => (
                          <tr key={lead.leadId}>
                            <td>{lead.leadId}</td>
                            <td>{lead.customerName}</td>
                            <td>{lead.phone}</td>
                            <td>{lead.city}</td>
                            <td>
                              <span className="badge badge-blue">{lead.service}</span>
                            </td>
                            <td style={{ maxWidth: 200, wordBreak: "break-word" }}>
                              {lead.description}
                            </td>
                            <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#718096" }}>
                              {new Date(lead.assignedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            {expandedProvider === null && (
              <div className="alert alert-info">
                Click on a provider card above to see their assigned leads.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
