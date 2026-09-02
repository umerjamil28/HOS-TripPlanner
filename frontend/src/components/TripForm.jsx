import LocationField from "./LocationField.jsx";

const SAMPLES = [
  {
    id: "short",
    label: "CHI → RFD",
    hint: "Same day",
    current_location: "Chicago, IL",
    pickup_location: "Chicago, IL",
    dropoff_location: "Rockford, IL",
    current_cycle_used: 12,
  },
  {
    id: "long",
    label: "CHI → LAX",
    hint: "Multi-day",
    current_location: "Chicago, IL",
    pickup_location: "Chicago, IL",
    dropoff_location: "Los Angeles, CA",
    current_cycle_used: 8,
  },
  {
    id: "restart",
    label: "DFW → ATL",
    hint: "Near 70",
    current_location: "Dallas, TX",
    pickup_location: "Dallas, TX",
    dropoff_location: "Atlanta, GA",
    current_cycle_used: 62,
  },
];

export default function TripForm({ value, onChange, onSubmit, loading, error }) {
  const set = (key, next) => onChange({ ...value, [key]: next });

  return (
    <form
      className="trip-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <LocationField
        label="Current location"
        value={value.current_location}
        onChange={(next) => set("current_location", next)}
        placeholder="Search city or address"
      />
      <LocationField
        label="Pickup location"
        value={value.pickup_location}
        onChange={(next) => set("pickup_location", next)}
        placeholder="Search shipper city or yard"
      />
      <LocationField
        label="Dropoff location"
        value={value.dropoff_location}
        onChange={(next) => set("dropoff_location", next)}
        placeholder="Search receiver city or warehouse"
        dropUp
      />
      <label className="cycle-field">
        <span className="cycle-head">
          Current cycle used
          <strong>{Number(value.current_cycle_used).toFixed(1)} hr</strong>
        </span>
        <input
          type="range"
          min="0"
          max="70"
          step="0.5"
          value={value.current_cycle_used}
          onChange={(e) => set("current_cycle_used", Number(e.target.value))}
        />
        <span className="cycle-meta">Hours already used in the 70-hr / 8-day week</span>
      </label>

      <div className="samples">
        <p>Quick routes</p>
        <div className="sample-row">
          {SAMPLES.map((sample) => (
            <button
              type="button"
              key={sample.id}
              className="sample"
              onClick={() =>
                onChange({
                  current_location: sample.current_location,
                  pickup_location: sample.pickup_location,
                  dropoff_location: sample.dropoff_location,
                  current_cycle_used: sample.current_cycle_used,
                })
              }
            >
              <span>{sample.label}</span>
              <small>{sample.hint}</small>
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <aside className="rail-assumptions">
        <p className="eyebrow">Assumptions</p>
        <p>
          Days start 6:00 AM. Logs use 15-minute increments. Pickup and dropoff
          are 1 hour on-duty. Fuel every 1,000 miles. 11-hour drive inside a
          14-hour window. 30-minute break after 8 hours driving. 10-hour sleeper.
          34-hour restart on the 70-hour / 8-day cycle.
        </p>
      </aside>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "Planning…" : "Plan trip"}
      </button>
    </form>
  );
}
