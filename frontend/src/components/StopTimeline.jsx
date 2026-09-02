const LABELS = {
  current: "Start",
  pickup: "Pickup",
  dropoff: "Dropoff",
  fuel: "Fuel",
  break: "30-min break",
  rest: "10-hr rest",
  restart: "34-hr restart",
};

function formatTime(iso) {
  if (!iso) return "";
  const [, time] = iso.split("T");
  return time;
}

export default function StopTimeline({ stops }) {
  if (!stops?.length) return null;

  return (
    <ol className="stop-timeline">
      {stops.map((stop, index) => (
        <li key={`${stop.kind}-${index}`} className={`stop-item kind-${stop.kind}`}>
          <span className="stop-index">{index + 1}</span>
          <div>
            <strong>{LABELS[stop.kind] || stop.kind}</strong>
            <p>
              {stop.location}
              {stop.duration_hours ? ` · ${stop.duration_hours} hr` : ""}
            </p>
          </div>
          <time>{formatTime(stop.time)}</time>
        </li>
      ))}
    </ol>
  );
}
