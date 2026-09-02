import LocationField from "./LocationField.jsx";

const SAMPLES = [
  {
    id: "short",
    label: "Chicago → Rockford",
    hint: "Same-day run",
    current_location: "Chicago, IL",
    pickup_location: "Chicago, IL",
    dropoff_location: "Rockford, IL",
    current_cycle_used: 12,
  },
  {
    id: "long",
    label: "Chicago → Los Angeles",
    hint: "Multi-day + fuel + rest",
    current_location: "Chicago, IL",
    pickup_location: "Chicago, IL",
    dropoff_location: "Los Angeles, CA",
    current_cycle_used: 8,
  },
  {
    id: "restart",
    label: "Dallas → Atlanta",
    hint: "Near 70-hr limit",
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
        <span className="cycle-meta">70-hour / 8-day property-carrying cycle</span>
      </label>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "Plotting duty status…" : "Plan trip & draw logs"}
      </button>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="samples">
        <p>Try a route</p>
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
    </form>
  );
}
