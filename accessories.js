const ACCESSORY_ALLOWANCES = Object.freeze({
  keyboard: 35,
  mouse: 25,
  headset: 55,
  speakers: 40,
  webcam: 35
});
const MONITOR_ALLOWANCES = Object.freeze({ "1080p": 140, "1440p": 240, "4k": 380 });

export const ACCESSORY_OPTIONS = Object.freeze([
  { id: "monitor", label: "Monitor" },
  { id: "keyboard", label: "Keyboard" },
  { id: "mouse", label: "Mouse" },
  { id: "headset", label: "Headset" },
  { id: "speakers", label: "Speakers" },
  { id: "webcam", label: "Webcam" }
]);

export function normalizeAccessories(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => ACCESSORY_OPTIONS.some(option => option.id === id)))].sort();
}

export function estimateAccessories(value, resolution = "1080p") {
  const selected = normalizeAccessories(value);
  return selected.reduce((sum, id) => sum + (id === "monitor" ? MONITOR_ALLOWANCES[resolution] ?? MONITOR_ALLOWANCES["1080p"] : ACCESSORY_ALLOWANCES[id]), 0);
}

export function describeAccessories(value, resolution = "1080p") {
  const selected = normalizeAccessories(value);
  return selected.map(id => ({
    id,
    label: ACCESSORY_OPTIONS.find(option => option.id === id).label,
    allowance: id === "monitor" ? MONITOR_ALLOWANCES[resolution] ?? MONITOR_ALLOWANCES["1080p"] : ACCESSORY_ALLOWANCES[id]
  }));
}
