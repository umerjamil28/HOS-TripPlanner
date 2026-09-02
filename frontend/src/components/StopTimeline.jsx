import { STOP_META, stopNote } from "../stopMeta.js";

function formatStamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.replace("T", " ");
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMiles(miles) {
  if (miles == null || miles === "") return "";
  const value = Number(miles);
  const label = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `Mile ${label}`;
}

export default function StopTimeline({ stops, title = "Stops & rest" }) {
  if (!stops?.length) return null;

  return (
    <div className="journey-tracker">
      {title ? <h3>{title}</h3> : null}
      <ol className="stop-timeline">
        {stops.map((stop, index) => {
          const meta = STOP_META[stop.kind] || STOP_META.current;
          const miles = formatMiles(stop.miles);
          const note = stopNote(stop);

          return (
            <li key={`${stop.kind}-${index}`} className={`stop-item kind-${stop.kind}`}>
              <span
                className="stop-icon"
                style={{ background: meta.color, color: meta.ink || "#fff" }}
                dangerouslySetInnerHTML={{
                  __html: meta.svg.replace("currentColor", meta.ink || "#fff"),
                }}
              />
              <article className="stop-card">
                <header className="stop-head">
                  <strong>{meta.label}</strong>
                  {miles ? <span className="stop-miles">{miles}</span> : null}
                </header>
                {stop.time ? <p className="stop-stamp">{formatStamp(stop.time)}</p> : null}
                <p className="stop-place">{stop.location}</p>
                {note ? <p className="stop-note">{note}</p> : null}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
