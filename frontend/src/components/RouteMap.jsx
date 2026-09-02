import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STOP_COLORS = {
  current: "#6f8f6a",
  pickup: "#e0a04a",
  dropoff: "#c45c42",
  fuel: "#3d6b8a",
  break: "#8a6a3d",
  rest: "#5b4d7a",
  restart: "#7a3d4d",
};

function markerIcon(kind, index) {
  const color = STOP_COLORS[kind] || "#1c1914";
  return L.divIcon({
    className: "stop-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span style="background:${color}">${index}</span>`,
  });
}

function FitRoute({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions?.length) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
  }, [map, positions]);
  return null;
}

export default function RouteMap({ geometry, stops }) {
  const positions = geometry?.length ? geometry : [[39.8, -98.5]];

  return (
    <MapContainer
      center={positions[0]}
      zoom={5}
      className="route-map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {geometry?.length > 1 ? (
        <Polyline
          positions={geometry}
          pathOptions={{ color: "#1c1914", weight: 4, opacity: 0.85 }}
        />
      ) : null}
      <FitRoute positions={geometry} />
      {stops?.map((stop, index) => (
        <Marker
          key={`${stop.kind}-${stop.time}-${index}`}
          position={[stop.lat, stop.lng]}
          icon={markerIcon(stop.kind, index + 1)}
        >
          <Popup>
            <strong>{stop.description}</strong>
            <br />
            {stop.location}
            <br />
            {stop.time.replace("T", " ")}
            {stop.duration_hours ? ` · ${stop.duration_hours} hr` : ""}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
