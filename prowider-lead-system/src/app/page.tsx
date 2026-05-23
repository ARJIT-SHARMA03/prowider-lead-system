// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <>
      <nav>
        <span className="brand">Prowider</span>
        <Link href="/request-service">Submit Request</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/test-tools">Test Tools</Link>
      </nav>
      <div className="container">
        <div className="page-header" style={{ marginTop: 48 }}>
          <h1>Prowider Lead Distribution System</h1>
          <p>A mini lead generation & distribution platform with fair allocation.</p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h2>📋 Submit a Request</h2>
            <p style={{ color: "#718096", marginBottom: 16, fontSize: 14 }}>
              Customers submit service enquiries. The system automatically saves the lead
              and distributes it to the right providers.
            </p>
            <Link href="/request-service">
              <button className="btn btn-primary">Go to Form →</button>
            </Link>
          </div>
          <div className="card">
            <h2>📊 Provider Dashboard</h2>
            <p style={{ color: "#718096", marginBottom: 16, fontSize: 14 }}>
              Providers see their assigned leads in real time — without refreshing the page.
            </p>
            <Link href="/dashboard">
              <button className="btn btn-success">View Dashboard →</button>
            </Link>
          </div>
          <div className="card">
            <h2>🔧 Test Tools</h2>
            <p style={{ color: "#718096", marginBottom: 16, fontSize: 14 }}>
              Test idempotency, concurrency, and quota reset via webhook simulation.
            </p>
            <Link href="/test-tools">
              <button className="btn btn-orange">Open Test Tools →</button>
            </Link>
          </div>
          <div className="card">
            <h2>⚙️ Business Rules</h2>
            <ul style={{ fontSize: 13, color: "#4a5568", lineHeight: 2, paddingLeft: 16 }}>
              <li>Service 1 → Provider 1 (mandatory) + 2 fair picks from pool [2,3,4]</li>
              <li>Service 2 → Provider 5 (mandatory) + 2 fair picks from pool [6,7,8]</li>
              <li>Service 3 → Providers 1 & 4 (mandatory) + 1 fair pick from pool [2,3,5,6,7,8]</li>
              <li>Each provider has a monthly quota of 10 leads</li>
              <li>Fair allocation uses round-robin (not random)</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
