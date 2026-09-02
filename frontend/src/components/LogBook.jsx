import { useState } from "react";
import LogSheet from "./LogSheet.jsx";

export default function LogBook({ logs, locations, cycleStart }) {
  const [dayIndex, setDayIndex] = useState(0);
  if (!logs?.length) return null;
  const safeIndex = Math.min(dayIndex, logs.length - 1);
  const log = logs[safeIndex];

  return (
    <section className="logbook">
      <header className="logbook-head">
        <div>
          <p className="eyebrow">Record of duty status</p>
          <h2>Daily log sheets</h2>
        </div>
        <div className="day-tabs" role="tablist">
          {logs.map((item, index) => (
            <button
              key={item.date}
              type="button"
              role="tab"
              aria-selected={index === safeIndex}
              className={index === safeIndex ? "active" : ""}
              onClick={() => setDayIndex(index)}
            >
              Day {index + 1}
              <small>{item.date}</small>
            </button>
          ))}
        </div>
      </header>
      <LogSheet log={log} locations={locations} cycleStart={cycleStart} />
    </section>
  );
}
