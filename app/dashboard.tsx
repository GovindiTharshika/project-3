"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";
type User = { id: string; name: string; email: string; role: Role };
type Plan = { id: string; name: string; description: string; priceCents: number; interval: string; usageAllowance: number; active: boolean; _count?: { customers: number } };
type Customer = { id: string; name: string; email: string; company: string; status: string; createdAt: string; plan: Plan; _count?: { usageRecords: number; billingEvents: number } };
type Usage = { id: string; units: number; metric: string; recordedAt: string; customer: { name: string; company: string; plan: { name: string; usageAllowance: number } } };
type BillingEvent = { id: string; amountCents: number; currency: string; status: string; description: string; createdAt: string; customer: { name: string; company: string } };
type Activity = { id: string; action: string; entityType: string; entityId: string; details: Record<string, unknown>; createdAt: string; actor: { name: string; role: Role } };
type Metrics = { activeCustomers: number; customerChange: number; monthlyRevenueCents: number; revenueChangeCents: number; invoicesThisMonth: number; usageThisMonth: number; newCustomersThisMonth: number };
type Analytics = { metrics: Metrics; revenueByMonth: { month: string; totalCents: number }[]; customersByPlan: { name: string; customers: number }[] };
type View = "Overview" | "Customers" | "Plans" | "Usage" | "Billing" | "Activity";

const navigation: { name: View; icon: string }[] = [
  { name: "Overview", icon: "◫" },
  { name: "Customers", icon: "♙" },
  { name: "Plans", icon: "▤" },
  { name: "Usage", icon: "⌁" },
  { name: "Billing", icon: "↗" },
  { name: "Activity", icon: "◷" },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "The request failed.");
  return body as T;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [billing, setBilling] = useState<BillingEvent[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");

  const loadData = useCallback(async (search = "") => {
    const [a, c, p, u, b, l] = await Promise.all([
      api<Analytics>("/api/analytics"),
      api<{ customers: Customer[] }>(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`),
      api<{ plans: Plan[] }>("/api/plans"),
      api<{ records: Usage[] }>("/api/usage"),
      api<{ events: BillingEvent[] }>("/api/billing"),
      api<{ activity: Activity[] }>("/api/activity"),
    ]);
    setAnalytics(a);
    setCustomers(c.customers);
    setPlans(p.plans);
    setUsage(u.records);
    setBilling(b.events);
    setActivity(l.activity);
  }, []);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then(async ({ user: current }) => {
        setUser(current);
        await loadData();
      })
      .catch((issue: unknown) => {
        if (!(issue instanceof Error) || issue.message !== "Authentication required.") {
          setError(issue instanceof Error ? issue.message : "The workspace could not be loaded.");
        }
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  const canManage = user?.role === "ADMIN";
  const canOperate = user?.role === "ADMIN" || user?.role === "ANALYST";

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(result.user);
      await loadData();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Sign-in failed.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAnalytics(null);
    setPassword("");
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    let endpoint = "";
    let payload: Record<string, string | number> = {};

    if (view === "Customers") {
      endpoint = "/api/customers";
      payload = { name: String(values.get("name")), email: String(values.get("email")), company: String(values.get("company")), planId: String(values.get("planId")), status: "ACTIVE" };
    } else if (view === "Plans") {
      endpoint = "/api/plans";
      payload = { name: String(values.get("name")), description: String(values.get("description")), priceCents: Math.round(Number(values.get("price")) * 100), interval: String(values.get("interval")), usageAllowance: Number(values.get("allowance")) };
    } else if (view === "Usage") {
      endpoint = "/api/usage";
      payload = { customerId: String(values.get("customerId")), units: Number(values.get("units")), metric: String(values.get("metric")) };
    } else {
      endpoint = "/api/billing";
      payload = { customerId: String(values.get("customerId")), amountCents: Math.round(Number(values.get("amount")) * 100), description: String(values.get("description")), idempotencyKey: crypto.randomUUID() };
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      await loadData(query);
      form.reset();
      setNotice(view === "Billing" ? "Simulated charge recorded successfully." : `${view.slice(0, -1)} added successfully.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const heading = useMemo(() => ({
    Overview: ["Good morning", "A clear view of your subscription business."],
    Customers: ["Customers", "Manage customer accounts and subscription health."],
    Plans: ["Plans", "Review pricing and included usage allowances."],
    Usage: ["Usage", "Track consumption against each customer plan."],
    Billing: ["Billing", "Review and simulate subscription billing events."],
    Activity: ["Activity log", "An audit-friendly record of workspace changes."],
  } as Record<View, [string, string]>)[view], [view]);

  if (loading) return <div className="loading-screen"><span className="brand-mark">s</span><span>Loading your workspace</span></div>;

  if (!user) {
    return (
      <main className="login-shell">
        <div className="login-visual">
          <div className="brand"><span className="brand-mark">s</span><span>subscript</span></div>
          <div className="login-message">
            <span className="eyebrow">SUBSCRIPTION INTELLIGENCE</span>
            <h1>Make every<br />customer count.</h1>
            <p>Understand recurring revenue, customer health, and product usage — all in one calm, clear workspace.</p>
            <div className="login-proof"><span className="proof-dot" /> Your business, in focus.</div>
          </div>
          <span className="login-foot">BUILT FOR TEAMS THAT GROW</span>
        </div>
        <div className="login-panel">
          <div className="login-panel-inner">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to Subscript</h2>
            <p className="muted">Use your workspace credentials to continue.</p>
            <form className="stack-form login-form" onSubmit={signIn}>
              <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
              <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
              {error && <div className="alert error-alert" role="alert">{error}</div>}
              <button className="primary-button full-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span>→</span></button>
            </form>
            <div className="login-secure"><span>⌑</span> Protected with encrypted sessions</div>
            <p className="login-help">Need access? Ask your workspace administrator.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand"><span className="brand-mark">s</span><span>subscript</span></div>
        <div className="workspace-switch"><span className="workspace-icon">A</span><span><strong>Acme Studio</strong><small>Workspace</small></span><span className="switch-chevron">⌄</span></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button key={item.name} aria-label={item.name} className={`nav-item ${view === item.name ? "selected" : ""}`} onClick={() => { setView(item.name); setError(""); setNotice(""); }}>
              <span className="nav-icon">{item.icon}</span><span>{item.name}</span>
              {item.name === "Activity" && <span className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">✳</span><strong>Need a hand?</strong><p>Explore the getting started guide.</p><button onClick={() => setNotice("See README.md for setup and usage guidance.")}>Open guide <span>↗</span></button></div>
          <button className="profile-button" onClick={signOut}>
            <span className="avatar">{initials(user.name)}</span><span className="profile-text"><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small></span><span className="profile-menu">↗</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{view}</strong></div><div className="topbar-right"><span className="live-status"><span /> Live data</span><span className="topbar-divider" /><button className="icon-button" aria-label="Notifications">♧<i /></button><button className="avatar top-avatar" aria-label={`Signed in as ${user.name}`}>{initials(user.name)}</button></div></header>
        <section className="content-area">
          <div className="page-title-row"><div><div className="eyebrow page-eyebrow">OVERVIEW / {view.toUpperCase()}</div><h1>{heading[0]}{view === "Overview" ? <span className="wave">✦</span> : null}</h1><p>{heading[1]}</p></div><div className="title-actions"><span className="date-chip"><span>◷</span> {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date())}</span>{canManage && ["Customers", "Plans"].includes(view) && <button className="primary-button" onClick={() => document.getElementById("create-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}>＋ Add {view === "Plans" ? "plan" : "customer"}</button>}</div></div>
          {error && <div className="alert error-alert" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
          {notice && <div className="alert success-alert" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {view === "Overview" && <Overview analytics={analytics} activity={activity} billing={billing} />}
          {view === "Customers" && <Customers customers={customers} query={query} setQuery={setQuery} onSearch={() => loadData(query).catch((issue) => setError(issue.message))} />}
          {view === "Plans" && <Plans plans={plans} />}
          {view === "Usage" && <UsageTable usage={usage} />}
          {view === "Billing" && <BillingTable billing={billing} />}
          {view === "Activity" && <ActivityTable activity={activity} />}
          {(["Customers", "Plans"].includes(view) && canManage || ["Usage", "Billing"].includes(view) && canOperate) && (
            <CreateForm view={view} plans={plans} customers={customers} busy={busy} onSubmit={createRecord} />
          )}
          {view === "Overview" && <div className="overview-footnote"><span>ⓘ</span> Revenue reflects simulated billing events only. No real payments are processed.</div>}
        </section>
      </main>
    </div>
  );
}

function Overview({ analytics, activity, billing }: { analytics: Analytics | null; activity: Activity[]; billing: BillingEvent[] }) {
  const metrics = analytics?.metrics;
  const revenue = analytics?.revenueByMonth ?? [];
  const maxRevenue = Math.max(...revenue.map((item) => item.totalCents), 10000);
  const points = revenue.map((item, index) => {
    const x = revenue.length < 2 ? 50 : 8 + (index / (revenue.length - 1)) * 84;
    const y = 90 - (item.totalCents / maxRevenue) * 70;
    return `${x},${y}`;
  }).join(" ");
  const monthLabels = revenue.map(({ month }) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(month)));
  return (
    <>
      <div className="metric-grid">
        <MetricCard title="Simulated revenue this month" value={money(metrics?.monthlyRevenueCents ?? 0)} trend={metrics?.revenueChangeCents ?? 0} context="vs. last month" icon="$" tone="blue" />
        <MetricCard title="Active customers" value={(metrics?.activeCustomers ?? 0).toLocaleString()} trend={metrics?.customerChange ?? 0} context="net this month" icon="♙" tone="violet" />
        <MetricCard title="Usage this month" value={(metrics?.usageThisMonth ?? 0).toLocaleString()} context="units consumed" icon="⌁" tone="orange" />
        <MetricCard title="Invoices processed" value={(metrics?.invoicesThisMonth ?? 0).toLocaleString()} context="this month" icon="▤" tone="green" />
      </div>
      <div className="chart-grid">
        <section className="panel revenue-panel">
          <div className="panel-heading"><div><h2>Revenue overview</h2><p>Successful simulated billing events over time</p></div><span className="period-pill">Last 6 months⌄</span></div>
          <div className="chart-summary"><strong>{money(metrics?.monthlyRevenueCents ?? 0)}</strong><span className={(metrics?.revenueChangeCents ?? 0) >= 0 ? "positive-change" : "negative-change"}>{(metrics?.revenueChangeCents ?? 0) >= 0 ? "↗" : "↘"} {money(Math.abs(metrics?.revenueChangeCents ?? 0))} <small>vs. last month</small></span></div>
          <div className="chart-area">
            <div className="chart-y-labels"><span>{money(maxRevenue)}</span><span>{money(maxRevenue * .66)}</span><span>{money(maxRevenue * .33)}</span><span>$0</span></div>
            <svg className="revenue-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Revenue trend chart">
              <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5975ed" stopOpacity=".20" /><stop offset="100%" stopColor="#5975ed" stopOpacity="0" /></linearGradient></defs>
              {[20, 43, 66, 89].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#edf0f5" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />)}
              {points && <><polygon points={`8,90 ${points} 92,90`} fill="url(#chartFill)" /><polyline points={points} fill="none" stroke="#6078ec" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />{revenue.map((item, index) => <circle key={item.month} cx={revenue.length < 2 ? 50 : 8 + (index / (revenue.length - 1)) * 84} cy={90 - (item.totalCents / maxRevenue) * 70} r="1.4" fill="white" stroke="#6078ec" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}</>}
            </svg>
          </div>
          <div className="chart-x-labels">{monthLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
        </section>
        <section className="panel plans-panel">
          <div className="panel-heading"><div><h2>Customers by plan</h2><p>Active subscription distribution</p></div><button className="more-button" aria-label="More plan options">···</button></div>
          <div className="donut-wrap"><div className="donut" style={{ background: donutGradient(analytics?.customersByPlan ?? []) }}><div className="donut-center"><strong>{(analytics?.customersByPlan ?? []).reduce((total, item) => total + item.customers, 0)}</strong><span>customers</span></div></div></div>
          <div className="legend-list">{(analytics?.customersByPlan ?? []).slice(0, 4).map((item, index) => <div className="legend-row" key={item.name}><span className={`legend-dot dot-${index}`} /><span>{item.name}</span><strong>{item.customers}</strong></div>)}{!analytics?.customersByPlan.length && <p className="empty-copy">Add customers to see plan distribution.</p>}</div>
        </section>
      </div>
      <div className="panel activity-preview">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes across your workspace</p></div><span className="activity-count">{activity.length} events</span></div>
        <ActivityRows activity={activity.slice(0, 5)} />
      </div>
      <div className="panel compact-billing"><div className="panel-heading"><div><h2>Latest billing</h2><p>Recent simulated charges</p></div><span className="activity-count">{billing.length} events</span></div><BillingRows billing={billing.slice(0, 4)} /></div>
    </>
  );
}

function donutGradient(items: { name: string; customers: number }[]) {
  const total = items.reduce((sum, item) => sum + item.customers, 0);
  const colors = ["#5c73e8", "#9b82e8", "#ffc56e", "#6ac9a5"];
  if (!total) return "#edf0f5";
  let start = 0;
  const slices = items.slice(0, colors.length).map((item, index) => {
    const end = start + (item.customers / total) * 100;
    const slice = `${colors[index]} ${start}% ${end}%`;
    start = end;
    return slice;
  });
  return `conic-gradient(${slices.join(", ")})`;
}

function MetricCard({ title, value, trend, context, icon, tone }: { title: string; value: string; trend?: number; context: string; icon: string; tone: string }) {
  return <section className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-bottom">{trend !== undefined ? <span className={trend >= 0 ? "positive-change" : "negative-change"}>{trend >= 0 ? "↗" : "↘"} {Math.abs(trend).toLocaleString()}</span> : <span className="metric-neutral">—</span>}<span>{context}</span></div></section>;
}

function Customers({ customers, query, setQuery, onSearch }: { customers: Customer[]; query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return <section className="panel table-panel"><div className="table-toolbar"><div><h2>All customers <span className="count-badge">{customers.length}</span></h2><p>Search and review customer accounts</p></div><form className="search-box" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><span>⌕</span><input aria-label="Search customers" placeholder="Search customers..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">Search</button></form></div><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>PLAN</th><th>STATUS</th><th>USAGE RECORDS</th><th>JOINED</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><div className="customer-cell"><span className="avatar small-avatar">{initials(customer.name)}</span><span><strong>{customer.name}</strong><small>{customer.company} · {customer.email}</small></span></div></td><td><span className="plan-tag">{customer.plan.name}</span></td><td><StatusBadge status={customer.status} /></td><td>{customer._count?.usageRecords ?? 0}</td><td>{dateLabel(customer.createdAt)}</td></tr>)}</tbody></table>{!customers.length && <EmptyState title="No customers yet" copy="Create the first customer to start tracking subscriptions." />}</div></section>;
}

function Plans({ plans }: { plans: Plan[] }) {
  return <div className="plan-card-grid">{plans.map((plan, index) => <section className={`plan-card plan-tone-${index % 3}`} key={plan.id}><div className="plan-card-top"><span className="plan-emblem">{["✳", "◈", "⌘"][index % 3]}</span><StatusBadge status={plan.active ? "ACTIVE" : "INACTIVE"} /></div><h2>{plan.name}</h2><p>{plan.description}</p><div className="plan-price">{money(plan.priceCents)}<span> / {plan.interval}</span></div><div className="plan-includes"><span>Included usage</span><strong>{plan.usageAllowance.toLocaleString()} units</strong></div><div className="plan-includes"><span>Customers</span><strong>{plan._count?.customers ?? 0}</strong></div></section>)}{!plans.length && <EmptyState title="No plans configured" copy="Add a plan before creating customer subscriptions." />}</div>;
}

function UsageTable({ usage }: { usage: Usage[] }) {
  return <section className="panel table-panel"><div className="table-toolbar"><div><h2>Usage records <span className="count-badge">{usage.length}</span></h2><p>Most recent consumption records, newest first</p></div><span className="date-chip">Current month</span></div><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>METRIC</th><th>UNITS</th><th>PLAN ALLOWANCE</th><th>RECORDED</th></tr></thead><tbody>{usage.map((row) => <tr key={row.id}><td><div className="customer-cell"><span className="avatar small-avatar">{initials(row.customer.name)}</span><span><strong>{row.customer.name}</strong><small>{row.customer.company}</small></span></div></td><td>{row.metric}</td><td><strong>{row.units.toLocaleString()}</strong></td><td>{row.customer.plan.usageAllowance.toLocaleString()} units</td><td>{dateLabel(row.recordedAt)}</td></tr>)}</tbody></table>{!usage.length && <EmptyState title="No usage tracked" copy="Add a usage record to see consumption here." />}</div></section>;
}

function BillingTable({ billing }: { billing: BillingEvent[] }) {
  return <section className="panel table-panel"><div className="table-toolbar"><div><h2>Billing events <span className="count-badge">{billing.length}</span></h2><p>Test-mode transactions only — no real payments are taken</p></div><span className="billing-sim-badge"><span /> Simulation mode</span></div><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>DESCRIPTION</th><th>AMOUNT</th><th>STATUS</th><th>DATE</th></tr></thead><tbody>{billing.map((row) => <tr key={row.id}><td><div className="customer-cell"><span className="avatar small-avatar">{initials(row.customer.name)}</span><span><strong>{row.customer.name}</strong><small>{row.customer.company}</small></span></div></td><td>{row.description}</td><td><strong>{money(row.amountCents)}</strong></td><td><StatusBadge status={row.status} /></td><td>{dateLabel(row.createdAt)}</td></tr>)}</tbody></table>{!billing.length && <EmptyState title="No billing events" copy="Run a simulated charge to start your billing history." />}</div></section>;
}

function ActivityTable({ activity }: { activity: Activity[] }) {
  return <section className="panel activity-table-panel"><div className="table-toolbar"><div><h2>Workspace events <span className="count-badge">{activity.length}</span></h2><p>Audit-friendly event trail for operational traceability</p></div><span className="audit-badge">⌑ Audit trail</span></div><ActivityRows activity={activity} detailed /></section>;
}

function ActivityRows({ activity, detailed = false }: { activity: Activity[]; detailed?: boolean }) {
  return <div className="activity-list">{activity.map((item) => <div className="activity-row" key={item.id}><span className="activity-icon">{item.entityType === "BillingEvent" ? "$" : item.entityType === "UsageRecord" ? "⌁" : item.entityType === "Customer" ? "♙" : "▤"}</span><span className="activity-message"><strong>{item.action.replace(".", " ")}</strong><small>{item.actor.name} · {item.actor.role.toLowerCase()} {detailed && `· ${item.entityType} ${item.entityId.slice(-7)}`}</small></span><span className="activity-time">{dateLabel(item.createdAt)}</span></div>)}{!activity.length && <EmptyState title="Nothing to report" copy="Updates to plans, customers, usage, and billing appear here." />}</div>;
}

function BillingRows({ billing }: { billing: BillingEvent[] }) {
  return <div className="billing-list">{billing.map((item) => <div className="billing-row" key={item.id}><span className="billing-symbol">$</span><span className="billing-customer"><strong>{item.customer.name}</strong><small>{item.description}</small></span><StatusBadge status={item.status} /><strong className="billing-amount">{money(item.amountCents)}</strong></div>)}{!billing.length && <EmptyState title="No recent invoices" copy="Billing events will appear here once simulated." />}</div>;
}

function CreateForm({ view, plans, customers, busy, onSubmit }: { view: View; plans: Plan[]; customers: Customer[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="panel create-panel" id="create-form"><div className="create-heading"><span className="create-icon">＋</span><div><h2>{view === "Plans" ? "Create a plan" : view === "Customers" ? "Add a customer" : view === "Usage" ? "Record usage" : "Simulate a charge"}</h2><p>{view === "Billing" ? "This records a test event only and does not process a real payment." : "Fields marked with * are required."}</p></div></div><form className="create-form" onSubmit={onSubmit}>
    {view === "Customers" && <><Field label="Full name" name="name" placeholder="e.g. Jamie Rivera" /><Field label="Work email" name="email" type="email" placeholder="jamie@company.com" /><Field label="Company" name="company" placeholder="Company name" /><label>Subscription plan<select name="planId" required defaultValue=""><option value="" disabled>Select a plan</option>{plans.filter((plan) => plan.active).map((plan) => <option value={plan.id} key={plan.id}>{plan.name} · {money(plan.priceCents)}/{plan.interval}</option>)}</select></label></>}
    {view === "Plans" && <><Field label="Plan name" name="name" placeholder="e.g. Growth" /><Field label="Price (USD)" name="price" type="number" placeholder="49" min="0" step="0.01" /><Field label="Usage allowance (units)" name="allowance" type="number" placeholder="10000" min="1" /><label>Billing interval<select name="interval"><option value="month">Monthly</option><option value="year">Yearly</option></select></label><label className="wide-field">Description<input name="description" placeholder="What's included in this plan?" required minLength={5} maxLength={240} /></label></>}
    {["Usage", "Billing"].includes(view) && <><label>Customer<select name="customerId" required defaultValue=""><option value="" disabled>Select a customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.company}</option>)}</select></label>{view === "Usage" ? <><Field label="Units consumed" name="units" type="number" placeholder="250" min="1" /><Field label="Metric" name="metric" placeholder="API calls" /></> : <><Field label="Amount (USD)" name="amount" type="number" placeholder="49.00" min="0.01" step="0.01" /><Field label="Description" name="description" placeholder="Monthly subscription" /></>}</>}
    <div className="form-submit-row"><span><span className="required-star">*</span> Required</span><button className="primary-button" disabled={busy || (view === "Customers" && plans.length === 0) || (["Usage", "Billing"].includes(view) && customers.length === 0)}>{busy ? "Saving…" : view === "Billing" ? "Record simulated charge →" : "Save changes →"}</button></div>
  </form></section>;
}

function Field({ label, name, placeholder, type = "text", min, step }: { label: string; name: string; placeholder: string; type?: string; min?: string; step?: string }) {
  return <label>{label}<input name={name} type={type} placeholder={placeholder} min={min} step={step} required /></label>;
}

function StatusBadge({ status }: { status: string }) {
  const style = status.toUpperCase() === "ACTIVE" || status.toUpperCase() === "SUCCEEDED" ? "status-success" : status.toUpperCase() === "TRIAL" || status.toUpperCase() === "PENDING" ? "status-warning" : "status-neutral";
  return <span className={`status-badge ${style}`}><i />{status.toLowerCase()}</span>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span>⌑</span><strong>{title}</strong><p>{copy}</p></div>;
}
