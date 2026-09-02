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

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } catch (err) {
      setError(err.message || "Could not plan this trip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <span className="mark">GL</span>
          <div>
            <p className="product">Gridline</p>
            <h1>Hours of service planner</h1>
          </div>
        </div>
        <p className="lede">
          Enter a current location, pickup, dropoff, and cycle hours. We route the trip,
          insert legally required breaks, and draw the daily log grid.
        </p>
        <TripForm
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </aside>

      <main className="stage">
        {!result ? (
          <div className="empty">
            <p className="eyebrow">Blank log</p>
            <h2>Fill the grid before you roll.</h2>
            <p>
              Property-carrying rules: 11 hours driving, 14-hour window, 30-minute break
              after 8 hours driving, fuel at least every 1,000 miles, 70 hours in 8 days.
            </p>
          </div>
        ) : (
          <>
            <section className="map-panel">
              <header className="panel-head">
                <div>
                  <p className="eyebrow">Route</p>
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
              <RouteMap geometry={result.route.geometry} stops={result.stops} />
            </section>
            <section className="stops-panel">
              <p className="eyebrow">Stops & rest</p>
              <h2>Duty changes along the route</h2>
              <StopTimeline stops={result.stops} />
            </section>
            <LogBook
              key={`${result.summary.total_miles}-${result.logs.length}`}
              logs={result.logs}
              locations={result.locations}
              cycleStart={result.summary.cycle_used_start}
            />
          </>
        )}
      </main>
    </div>
  );
}
