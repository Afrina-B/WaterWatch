export const nodes = [
  {
    id: 'NODE-01',
    name: 'Node 1 - Upstream (ESP32 DevKit)',
    role: 'Upstream Intake',
    location: 'Upstream Water Intake (Physical Hardware)',
    lat: 11.0183,
    lng: 76.9614,
    sourceType: 'hardware',
    isHardware: true,
  },
  {
    id: 'NODE-02',
    name: 'Node 2 - Pollution Area (Simulated)',
    role: 'Pollution Screening',
    location: 'Industrial Effluent Confluence (Simulated)',
    lat: 11.0192,
    lng: 76.9631,
    sourceType: 'simulated',
    isHardware: false,
  },
  {
    id: 'NODE-03',
    name: 'Node 3 - Downstream (Simulated)',
    role: 'Downstream Distribution',
    location: 'Community Reservoir Outlet (Simulated)',
    lat: 11.0201,
    lng: 76.9648,
    sourceType: 'simulated',
    isHardware: false,
  },
]

export const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]))
export default nodes
