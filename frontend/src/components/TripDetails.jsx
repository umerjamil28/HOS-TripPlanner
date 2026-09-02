import { STOP_META, stopStayLabel } from "../stopMeta.js";

function formatDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.replace("T", " ");
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMiles(miles) {
  if (miles == null || miles === "") return "—";
  const value = Number(miles);
  const label = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `Mile ${label}`;
}

function groupByDay(stops) {
  const groups = [];
  const index = new Map();
  stops.forEach((stop) => {
    const key = stop.time?.slice(0, 10) || "unknown";
    if (!index.has(key)) {
      const group = { key, label: formatDay(stop.time), stops: [] };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).stops.push(stop);
  });
  return groups;
}

function countKind(stops, kind) {
  return stops.filter((stop) => stop.kind === kind).length;
}

export default function TripDetails({ result }) {
  const stops = result?.stops || [];
  const days = groupByDay(stops);
  const pickup = result?.locations?.pickup?.city_state || "Pickup";
  const dropoff = result?.locations?.dropoff?.city_state || "Dropoff";
  const summary = result?.summary || {};
  const route = result?.route || {};

  const facts = [
    { label: "Stops", value: String(stops.length) },
    { label: "Drive time", value: `${route.duration_hours ?? "—"} hr` },
    { label: "Fuel stops", value: String(countKind(stops, "fuel")) },
    { label: "Sleeper rests", value: String(countKind(stops, "rest")) },
  ];

  return (
    <div className="details-panel">
      <header className="details-head">
        <div>
          <p className="eyebrow">Dispatch sheet</p>
          <h2>Itinerary</h2>
          <p className="details-route">
            {pickup} → {dropoff}
            {summary.cycle_used_start != null
              ? ` · cycle started at ${summary.cycle_used_start} hr`
              : ""}
          </p>
        </div>
        <ul className="details-facts">
          {facts.map((fact) => (
            <li key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </li>
          ))}
        </ul>
      </header>

      {days.map((day) => (
        <section key={day.key} className="itinerary-day">
          <h3>{day.label}</h3>
          <div className="itinerary-wrap">
            <table className="itinerary-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Stop</th>
                  <th>Location</th>
                  <th>Stay</th>
                  <th>Mile</th>
                </tr>
              </thead>
              <tbody>
                {day.stops.map((stop, index) => {
                  const meta = STOP_META[stop.kind] || STOP_META.current;
                  return (
                    <tr key={`${stop.kind}-${stop.time}-${index}`}>
                      <td className="itinerary-time">{formatClock(stop.time)}</td>
                      <td>
                        <span className="itinerary-kind">
                          <i style={{ background: meta.color }} />
                          {meta.label}
                        </span>
                      </td>
                      <td>{stop.location}</td>
                      <td>{stopStayLabel(stop) || "—"}</td>
                      <td className="itinerary-mile">{formatMiles(stop.miles)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
