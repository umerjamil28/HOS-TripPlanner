import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STOP_META, markerHtml, stopStayLabel } from "../stopMeta.js";

function markerIcon(kind) {
  return L.divIcon({
    className: "stop-marker",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
    html: markerHtml(kind),
  });
}

function FitRoute({ positions, active }) {
  const map = useMap();
  useEffect(() => {
    if (!positions?.length) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 11 });
  }, [map, positions]);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [active, map]);

  return null;
}

export default function RouteMap({ geometry, stops, active }) {
  const positions = geometry?.length ? geometry : [[39.8, -98.5]];
  const legendKinds = [...new Set((stops || []).map((stop) => stop.kind))];

  return (
    <div className="map-wrap">
      <MapContainer
        center={positions[0]}
        zoom={5}
        className="route-map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        {geometry?.length > 1 ? (
          <Polyline
            positions={geometry}
            pathOptions={{ color: "rgb(32, 178, 170)", weight: 5, opacity: 0.92 }}
          />
        ) : null}
        <FitRoute positions={geometry} active={active} />
        {stops?.map((stop, index) => (
          <Marker
            key={`${stop.kind}-${stop.time}-${index}`}
            position={[stop.lat, stop.lng]}
            icon={markerIcon(stop.kind)}
          >
            <Popup>
              <div className="map-popup">
                <strong>{STOP_META[stop.kind]?.label || stop.kind}</strong>
                <p>{stop.location}</p>
                <p>{stop.time.replace("T", " ")}</p>
                <p>
                  {stop.miles != null
                    ? `Mile ${Number(stop.miles).toFixed(1).replace(/\.0$/, "")}`
                    : null}
                  {stop.miles != null && stop.duration_hours ? " · " : null}
                  {stopStayLabel(stop)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <aside className="map-legend">
        <p>Map index</p>
        {legendKinds.map((kind) => (
          <div key={kind} className="legend-row">
            <span
              className="legend-icon"
              style={{ background: STOP_META[kind]?.color }}
              dangerouslySetInnerHTML={{
                __html: (STOP_META[kind]?.svg || "").replace(
                  "currentColor",
                  STOP_META[kind]?.ink || "#fff"
                ),
              }}
            />
            {STOP_META[kind]?.label || kind}
          </div>
        ))}
      </aside>
    </div>
  );
}
