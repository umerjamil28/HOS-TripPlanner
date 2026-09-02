const ROWS = [
  { key: "off_duty", label: "Off duty", color: "#8b8b8b" },
  { key: "sleeper", label: "Sleeper", color: "#7b61ff" },
  { key: "driving", label: "Driving", color: "rgb(32, 178, 170)" },
  { key: "on_duty", label: "On duty", color: "#f0a202" },
];

const ROW_INDEX = Object.fromEntries(ROWS.map((row, index) => [row.key, index]));

function formatLongDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function graphPath(segments, x0, y0, gridW, rowH) {
  if (!segments?.length) return "";
  const xAt = (hour) => x0 + (hour / 24) * gridW;
  const yAt = (status) => y0 + (ROW_INDEX[status] ?? 0) * rowH + rowH / 2;

  let d = `M ${xAt(segments[0].start_hour)} ${yAt(segments[0].status)}`;
  segments.forEach((segment, index) => {
    d += ` L ${xAt(segment.end_hour)} ${yAt(segment.status)}`;
    const next = segments[index + 1];
    if (next) {
      d += ` L ${xAt(segment.end_hour)} ${yAt(next.status)}`;
    }
  });
  return d;
}

function hourLabel(hour) {
  if (hour === 0 || hour === 24) return "12a";
  if (hour === 12) return "12p";
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

export default function LogSheet({ log, locations, cycleStart }) {
  const x0 = 132;
  const y0 = 28;
  const gridW = 780;
  const rowH = 40;
  const gridH = rowH * 4;
  const path = graphPath(log.segments, x0, y0, gridW, rowH);
  const totals = log.totals;
  const recap = log.recap;
  const hourTicks = Array.from({ length: 25 }, (_, hour) => hour);

  return (
    <div className="log-sheet">
      <header className="log-meta">
        <div>
          <p className="eyebrow">Duty status</p>
          <h3>{formatLongDate(log.date)}</h3>
          <p className="log-route">
            {log.from_location} → {log.to_location}
          </p>
        </div>
        <ul className="log-kpis">
          <li>
            <span>Miles today</span>
            <strong>{log.total_miles}</strong>
          </li>
          <li>
            <span>Driving today</span>
            <strong>{totals.driving.toFixed(1)} hr</strong>
          </li>
          <li>
            <span>On duty today</span>
            <strong>{recap.on_duty_today.toFixed(1)} hr</strong>
          </li>
          <li>
            <span>Available tomorrow</span>
            <strong>{recap.available_tomorrow.toFixed(1)} hr</strong>
          </li>
        </ul>
      </header>

      <div className="log-graph">
        <svg viewBox="0 0 1000 198" role="img" aria-label={`Duty graph for ${log.date}`}>
          <rect className="log-grid-bg" x={x0} y={y0} width={gridW} height={gridH} rx="8" />

          {ROWS.map((row, index) => (
            <g key={row.key}>
              <text
                x={x0 - 12}
                y={y0 + index * rowH + 26}
                textAnchor="end"
                className="log-row"
                fill={row.color}
              >
                {row.label}
              </text>
              {index < 3 ? (
                <line
                  className="log-grid-line"
                  x1={x0}
                  y1={y0 + (index + 1) * rowH}
                  x2={x0 + gridW}
                  y2={y0 + (index + 1) * rowH}
                />
              ) : null}
              <text x={x0 + gridW + 14} y={y0 + index * rowH + 26} className="log-total">
                {totals[row.key]?.toFixed(2)}
              </text>
            </g>
          ))}
          <text x={x0 + gridW + 14} y={y0 - 8} className="log-hour-cap">
            Hours
          </text>

          {hourTicks.map((hour) => {
            const x = x0 + (hour / 24) * gridW;
            return (
              <g key={hour}>
                <line
                  className={hour % 6 === 0 ? "log-grid-strong" : "log-grid-line"}
                  x1={x}
                  y1={y0}
                  x2={x}
                  y2={y0 + gridH}
                />
                {hour < 24
                  ? [1, 2, 3].map((q) => (
                      <line
                        key={`${hour}-${q}`}
                        className="log-grid-minor"
                        x1={x + (q / 4) * (gridW / 24)}
                        y1={y0}
                        x2={x + (q / 4) * (gridW / 24)}
                        y2={y0 + gridH}
                      />
                    ))
                  : null}
                {hour % 2 === 0 ? (
                  <text x={x} y={y0 - 8} textAnchor="middle" className="log-hour">
                    {hourLabel(hour)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {log.segments.map((segment, index) => {
            const x = x0 + (segment.start_hour / 24) * gridW;
            const width = Math.max(1.5, ((segment.end_hour - segment.start_hour) / 24) * gridW);
            const row = ROW_INDEX[segment.status] ?? 0;
            const y = y0 + row * rowH + 10;
            const fill = ROWS[row]?.color || "rgb(32, 178, 170)";
            return (
              <rect
                key={`bar-${index}`}
                x={x}
                y={y}
                width={width}
                height={rowH - 20}
                rx="4"
                fill={fill}
                opacity="0.88"
              />
            );
          })}

          <path
            d={path}
            fill="none"
            stroke="var(--spotter-text)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            opacity="0.35"
          />
        </svg>
        <ul className="log-legend">
          {ROWS.map((row) => (
            <li key={row.key}>
              <i style={{ background: row.color }} />
              {row.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="log-bottom">
        <section className="log-remarks">
          <p className="eyebrow">What happened today</p>
          <ul>
            {log.remarks.map((remark, index) => (
              <li key={`${remark.time}-${index}`} className={`remark-row status-${remark.status || ""}`}>
                <time>{remark.time}</time>
                <div>
                  <strong>{remark.title || remark.text}</strong>
                  {remark.title && remark.text ? <p>{remark.text}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="log-recap">
          <p className="eyebrow">70 / 8 recap</p>
          <p className="log-recap-note">Cycle start {cycleStart} hr · {locations?.current?.city_state || "home terminal"}</p>
          <dl>
            <div>
              <dt>Last 7 days</dt>
              <dd>{recap.last_7_days.toFixed(1)} hr</dd>
            </div>
            <div>
              <dt>Last 8 days</dt>
              <dd>{recap.last_8_days.toFixed(1)} hr</dd>
            </div>
            <div>
              <dt>Available tomorrow</dt>
              <dd>{recap.available_tomorrow.toFixed(1)} hr</dd>
            </div>
          </dl>
          <p className="log-recap-fine">
            A 34-hour restart restores 70 hours. Totals on the graph include 15-minute increments.
          </p>
        </section>
      </div>
    </div>
  );
}
