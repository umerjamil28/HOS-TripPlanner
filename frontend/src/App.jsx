import { useMemo, useState } from "react";
import { planTrip } from "./api.js";
import TripForm from "./components/TripForm.jsx";
import RouteMap from "./components/RouteMap.jsx";
import StopTimeline from "./components/StopTimeline.jsx";
import LogBook from "./components/LogBook.jsx";

const EMPTY_FORM = {
  current_location: "Chicago, IL",
  pickup_location: "Chicago, IL",
  dropoff_location: "Rockford, IL",
  current_cycle_used: 12,
};

const TABS = [
  { id: "map", label: "Map" },
  { id: "logs", label: "Logs chart" },
  { id: "details", label: "Trip details" },
];

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("map");

  const summary = result?.summary;

  const stats = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Miles", value: summary.total_miles },
      { label: "Log days", value: summary.total_days },
      { label: "Cycle used", value: `${summary.cycle_used_end} hr` },
      { label: "Available", value: `${summary.hours_remaining} hr` },
    ];
  }, [summary]);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const payload = await planTrip({
        current_location: form.current_location,
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        current_cycle_used: Number(form.current_cycle_used),
      });
      setResult(payload);
      setTab("map");
    } catch (err) {
      setError(err.message || "Could not plan this trip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">S</span>
          <div>
            <p className="product">Spotter</p>
            <h1>HOS trip planner</h1>
          </div>
        </div>
        <p className="topbar-note">Property-carrying · 70 hr / 8 day</p>
      </header>

      <div className="workspace">
        <aside className="rail">
          <TripForm
            value={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        </aside>

        <main className="stage">
          {result ? (
            <header className="trip-summary">
              <div>
                <p className="eyebrow">Trip</p>
                <h2>
                  {result.locations.pickup.city_state} → {result.locations.dropoff.city_state}
                </h2>
              </div>
              <ul className="stats">
                {stats.map((stat) => (
                  <li key={stat.label}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </li>
                ))}
              </ul>
            </header>
          ) : null}

          <div className="stage-tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
                disabled={!result && item.id !== "map"}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="stage-body">
            {!result ? (
              <div className="empty">
                <p className="eyebrow">Ready to dispatch</p>
                <h2>Plan a trip to see the map, logs, and stops.</h2>
                <p>
                  11-hour driving limit, 14-hour window, 30-minute break after 8 hours
                  driving, fuel every 1,000 miles.
                </p>
              </div>
            ) : (
              <>
                <section className={`tab-panel ${tab === "map" ? "active" : ""}`}>
                  <RouteMap
                    geometry={result.route.geometry}
                    stops={result.stops}
                    active={tab === "map"}
                  />
                </section>
                <section className={`tab-panel tab-scroll ${tab === "logs" ? "active" : ""}`}>
                  <LogBook
                    key={`${result.summary.total_miles}-${result.logs.length}`}
                    logs={result.logs}
                    locations={result.locations}
                    cycleStart={result.summary.cycle_used_start}
                  />
                </section>
                <section className={`tab-panel tab-scroll ${tab === "details" ? "active" : ""}`}>
                  <div className="details-panel">
                    <p className="eyebrow">Stops & rest</p>
                    <StopTimeline stops={result.stops} />
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
