const ROWS = [
  { key: "off_duty", label: "Off Duty" },
  { key: "sleeper", label: "Sleeper Berth" },
  { key: "driving", label: "Driving" },
  { key: "on_duty", label: "On Duty (not driving)" },
];

const ROW_INDEX = Object.fromEntries(ROWS.map((row, index) => [row.key, index]));

function formatDateParts(isoDate) {
  const [year, month, day] = (isoDate || "").split("-");
  return { month, day, year };
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

export default function LogSheet({ log, locations, cycleStart }) {
  const x0 = 168;
  const y0 = 248;
  const gridW = 780;
  const rowH = 38;
  const gridH = rowH * 4;
  const { month, day, year } = formatDateParts(log.date);
  const path = graphPath(log.segments, x0, y0, gridW, rowH);
  const totals = log.totals;
  const recap = log.recap;

  const hourTicks = Array.from({ length: 25 }, (_, hour) => hour);

  return (
    <div className="log-sheet">
      <svg viewBox="0 0 1100 780" role="img" aria-label={`Drivers daily log for ${log.date}`}>
        <rect width="1100" height="780" fill="#f7f1e3" />
        <rect x="18" y="18" width="1064" height="744" fill="none" stroke="#1c1914" strokeWidth="2" />

        <text x="36" y="48" className="log-title">
          Drivers Daily Log (24 hours)
        </text>
        <text x="1064" y="40" textAnchor="end" className="log-fine">
          Original — File at home terminal.
        </text>
        <text x="1064" y="58" textAnchor="end" className="log-fine">
          Duplicate — Driver retains in his/her possession for 8 days.
        </text>

        <text x="36" y="86" className="log-label">
          Date
        </text>
        <rect x="78" y="68" width="52" height="28" fill="#fff" stroke="#1c1914" />
        <rect x="136" y="68" width="52" height="28" fill="#fff" stroke="#1c1914" />
        <rect x="194" y="68" width="70" height="28" fill="#fff" stroke="#1c1914" />
        <text x="104" y="87" textAnchor="middle" className="log-write">
          {month}
        </text>
        <text x="162" y="87" textAnchor="middle" className="log-write">
          {day}
        </text>
        <text x="229" y="87" textAnchor="middle" className="log-write">
          {year}
        </text>
        <text x="104" y="110" textAnchor="middle" className="log-fine">
          (month)
        </text>
        <text x="162" y="110" textAnchor="middle" className="log-fine">
          (day)
        </text>
        <text x="229" y="110" textAnchor="middle" className="log-fine">
          (year)
        </text>

        <text x="300" y="86" className="log-label">
          From:
        </text>
        <line x1="350" y1="88" x2="640" y2="88" stroke="#1c1914" />
        <text x="356" y="84" className="log-write">
          {log.from_location}
        </text>
        <text x="660" y="86" className="log-label">
          To:
        </text>
        <line x1="690" y1="88" x2="1064" y2="88" stroke="#1c1914" />
        <text x="696" y="84" className="log-write">
          {log.to_location}
        </text>

        <rect x="36" y="122" width="170" height="58" fill="#fff" stroke="#1c1914" />
        <text x="121" y="142" textAnchor="middle" className="log-fine">
          Total Miles Driving Today
        </text>
        <text x="121" y="168" textAnchor="middle" className="log-write lg">
          {log.total_miles}
        </text>
        <rect x="216" y="122" width="150" height="58" fill="#fff" stroke="#1c1914" />
        <text x="291" y="142" textAnchor="middle" className="log-fine">
          Total Mileage Today
        </text>
        <text x="291" y="168" textAnchor="middle" className="log-write lg">
          {log.total_miles}
        </text>
        <rect x="376" y="122" width="688" height="58" fill="#fff" stroke="#1c1914" />
        <text x="392" y="142" className="log-fine">
          Truck/Tractor and Trailer Numbers or License Plate(s)/State
        </text>
        <text x="392" y="168" className="log-write">
          CMV — property-carrying · 70hr/8day
        </text>

        <text x="36" y="204" className="log-label">
          Name of Carrier or Carriers
        </text>
        <line x1="248" y1="206" x2="1064" y2="206" stroke="#1c1914" />
        <text x="256" y="202" className="log-write">
          Property-carrying motor carrier
        </text>
        <text x="36" y="228" className="log-label">
          Main Office Address
        </text>
        <line x1="188" y1="230" x2="620" y2="230" stroke="#1c1914" />
        <text x="196" y="226" className="log-write">
          {locations?.pickup?.city_state || "—"}
        </text>
        <text x="640" y="228" className="log-label">
          Home Terminal Address
        </text>
        <line x1="812" y1="230" x2="1064" y2="230" stroke="#1c1914" />
        <text x="820" y="226" className="log-write">
          {locations?.current?.city_state || "—"}
        </text>

        <rect x={x0} y={y0} width={gridW} height={gridH} fill="#fffdf7" stroke="#c45c42" />
        {ROWS.map((row, index) => (
          <g key={row.key}>
            <text x={x0 - 12} y={y0 + index * rowH + 24} textAnchor="end" className="log-row">
              {index + 1} {row.label}
            </text>
            <line
              x1={x0}
              y1={y0 + (index + 1) * rowH}
              x2={x0 + gridW}
              y2={y0 + (index + 1) * rowH}
              stroke="#c45c42"
              strokeWidth={index === 3 ? 1.4 : 0.8}
            />
            <rect x={x0 + gridW + 8} y={y0 + index * rowH + 6} width="70" height="26" fill="#fff" stroke="#1c1914" />
            <text
              x={x0 + gridW + 43}
              y={y0 + index * rowH + 24}
              textAnchor="middle"
              className="log-write"
            >
              {totals[row.key]?.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={x0 + gridW + 43} y={y0 - 10} textAnchor="middle" className="log-fine">
          Total Hours
        </text>

        {hourTicks.map((hour) => {
          const x = x0 + (hour / 24) * gridW;
          return (
            <g key={hour}>
              <line x1={x} y1={y0} x2={x} y2={y0 + gridH} stroke="#c45c42" strokeWidth={hour % 12 === 0 ? 1.3 : 0.45} />
              {[1, 2, 3].map((q) =>
                hour < 24 ? (
                  <line
                    key={`${hour}-${q}`}
                    x1={x + (q / 4) * (gridW / 24)}
                    y1={y0}
                    x2={x + (q / 4) * (gridW / 24)}
                    y2={y0 + gridH}
                    stroke="#e2b2a4"
                    strokeWidth="0.4"
                  />
                ) : null
              )}
              <text x={x} y={y0 - 8} textAnchor="middle" className="log-hour">
                {hour === 0 || hour === 24 ? "Midnight" : hour === 12 ? "Noon" : hour}
              </text>
            </g>
          );
        })}

        <path d={path} fill="none" stroke="#1c1914" strokeWidth="2.4" strokeLinejoin="round" />

        {log.segments.map((segment, index) => {
          const x = x0 + (segment.start_hour / 24) * gridW;
          return (
            <line
              key={`flag-${index}`}
              x1={x}
              y1={y0 + gridH}
              x2={x}
              y2={y0 + gridH + 18}
              stroke="#1c1914"
              strokeWidth="1"
            />
          );
        })}

        <text x="36" y={y0 + gridH + 40} className="log-label">
          Remarks
        </text>
        <text x="130" y={y0 + gridH + 40} className="log-fine">
          Enter name of place you reported and where released from work and when and where each change of duty occurred.
        </text>
        <rect x="36" y={y0 + gridH + 50} width="1028" height="96" fill="#fffdf7" stroke="#1c1914" />
        {log.remarks.slice(0, 6).map((remark, index) => (
          <text key={remark.time + index} x="48" y={y0 + gridH + 72 + index * 14} className="log-remark">
            {remark.time} · {remark.text}
          </text>
        ))}

        <text x="36" y="700" className="log-label">
          Recap: Complete at end of day
        </text>
        <rect x="36" y="712" width="220" height="36" fill="#fff" stroke="#1c1914" />
        <text x="48" y="726" className="log-fine">
          On duty hours today, lines 3 & 4
        </text>
        <text x="48" y="742" className="log-write">
          {recap.on_duty_today.toFixed(2)}
        </text>

        <rect x="268" y="712" width="796" height="36" fill="#fff" stroke="#1c1914" />
        <text x="284" y="726" className="log-fine">
          70 Hour / 8 Day Drivers · cycle start {cycleStart} hr
        </text>
        <text x="284" y="742" className="log-write">
          A. Last 7 days incl. today {recap.last_7_days.toFixed(2)} · B. Available tomorrow {recap.available_tomorrow.toFixed(2)} · C. Last 8 days incl. today {recap.last_8_days.toFixed(2)}
        </text>
        <text x="36" y="766" className="log-fine">
          * If you took 34 consecutive hours off duty you have 70 hours available.
        </text>
      </svg>
    </div>
  );
}
