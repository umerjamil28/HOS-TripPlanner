import { STOP_META } from "../stopMeta.js";

function formatTime(iso) {
  if (!iso) return "";
  const [, time] = iso.split("T");
  return time;
}

export default function StopTimeline({ stops }) {
  if (!stops?.length) return null;

  return (
    <ol className="stop-timeline">
      {stops.map((stop, index) => {
        const meta = STOP_META[stop.kind] || STOP_META.current;
        return (
          <li key={`${stop.kind}-${index}`} className={`stop-item kind-${stop.kind}`}>
            <span
              className="stop-icon"
              style={{ background: meta.color, color: meta.ink || "#fff" }}
              dangerouslySetInnerHTML={{
                __html: meta.svg.replace("currentColor", meta.ink || "#fff"),
              }}
            />
            <div>
              <strong>{meta.label}</strong>
              <p>
                {stop.location}
                {stop.duration_hours ? ` · ${stop.duration_hours} hr` : ""}
              </p>
            </div>
            <time>{formatTime(stop.time)}</time>
          </li>
        );
      })}
    </ol>
  );
}
