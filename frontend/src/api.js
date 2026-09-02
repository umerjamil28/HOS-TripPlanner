export async function planTrip(payload) {
  const response = await fetch("/api/plan-trip/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.string || JSON.stringify(item)).join(" ")
      : detail || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function suggestLocations(query, signal) {
  const q = query.trim();
  if (q.length < 2) return [];
  const response = await fetch(`/api/locations/?q=${encodeURIComponent(q)}`, { signal });
  if (!response.ok) return [];
  return response.json();
}
