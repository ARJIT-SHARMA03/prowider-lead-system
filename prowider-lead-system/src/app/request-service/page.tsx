"use client";
// src/app/request-service/page.tsx

import Link from "next/link";
import { useState, useEffect } from "react";

interface Service {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  name: string;
}

interface SubmitResult {
  message: string;
  lead: {
    id: number;
    name: string;
    service: string;
  };
  assignedProviders: Assignment[];
}

export default function RequestServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    serviceId: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/leads/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
        setForm({ name: "", phone: "", city: "", serviceId: "", description: "" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <div className="page-header">
          <h1>Request a Service</h1>
          <p>Fill in your details and we'll connect you with the right providers.</p>
        </div>

        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="e.g. 9999999999"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="serviceId">Service Type</label>
                <select
                  id="serviceId"
                  name="serviceId"
                  value={form.serviceId}
                  onChange={handleChange}
                  required
                >
                  <option value="">— Select a service —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Describe what you need..."
                  value={form.description}
                  onChange={handleChange}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? <span className="spinner" /> : null}
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </form>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
              <div className="alert alert-success">
                <strong>✓ Lead #{result.lead.id} submitted!</strong>
                <p style={{ marginTop: 4, fontSize: 13 }}>
                  Assigned to:{" "}
                  {result.assignedProviders.map((p) => p.name).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
