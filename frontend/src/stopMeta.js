export const STOP_META = {
  current: {
    label: "Trip start",
    color: "#1a73e8",
    note: "Where the truck is now, before this trip starts.",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,
  },
  pickup: {
    label: "Pickup",
    color: "rgb(32, 178, 170)",
    note: "1 hour loading (on-duty, not driving)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1.5 10h-13z"/><path d="M8 9V6h8v3"/><path d="M12 13v3"/></svg>`,
  },
  dropoff: {
    label: "Dropoff",
    color: "#ff5a5a",
    note: "1 hour unloading (on-duty, not driving)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4h8l-2 4 2 4H6"/></svg>`,
  },
  fuel: {
    label: "Fuel stop",
    color: "#2f6fed",
    note: "At least once every 1,000 miles (on-duty)",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="10" height="18" rx="1"/><path d="M8 7h2M14 7l5 4v7a2 2 0 0 1-2 2h-1"/><path d="M14 11h3"/></svg>`,
  },
  break: {
    label: "30-min break",
    color: "#f0a202",
    note: "Required after 8 hours of driving",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6"/></svg>`,
  },
  rest: {
    label: "10-hr sleeper rest",
    color: "#7b61ff",
    note: "Sleeper berth — resets the 11-hour and 14-hour clocks",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-5a4 4 0 0 1 4-4h7v9"/><path d="M3 18h18"/><path d="M19 18V8a2 2 0 0 0-2-2h-1"/></svg>`,
  },
  restart: {
    label: "34-hr restart",
    color: "#e85d04",
    note: "Resets the 70-hour / 8-day cycle",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`,
  },
};

export function stopNote(stop) {
  const meta = STOP_META[stop.kind];
  return meta?.note || stop.description || "";
}

function formatStayHours(hours) {
  const value = Number(hours);
  if (value === 0.5) return "30 min";
  if (value === 1) return "1 hr";
  return `${value} hr`;
}

const STAY_ACTION = {
  pickup: "loading",
  dropoff: "unloading",
  fuel: "fueling",
  break: "off duty",
  rest: "in sleeper",
  restart: "off duty (cycle reset)",
};

export function stopStayLabel(stop) {
  if (!stop?.duration_hours) return "";
  const time = formatStayHours(stop.duration_hours);
  const action = STAY_ACTION[stop.kind];
  return action ? `${time} ${action}` : `${time} at this stop`;
}

export function markerHtml(kind) {
  const meta = STOP_META[kind] || STOP_META.current;
  const ink = meta.ink || "#fff";
  const svg = meta.svg.replace("currentColor", ink);
  return `<div class="map-pin" style="--pin:${meta.color};--ink:${ink}">
    <div class="map-pin-head">${svg}</div>
    <i></i>
  </div>`;
}
