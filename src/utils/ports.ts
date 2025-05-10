export function parsePortString(ports: string[]): { ExposedPorts: { [key: string]: {} }; PortBindings: { [key: string]: { HostPort: string }[] } } {
  if (!ports || ports.length === 0) {
    return {
      ExposedPorts: {},
      PortBindings: {},
    };
  }

  let ExposedPorts: { [key: string]: {} } = {};
  let PortBindings: { [key: string]: { HostPort: string }[] } = {};

  for (const port of ports) {
    let hostPort: string;
    let containerPort: string;

    if (port.includes(":")) {
      [hostPort, containerPort] = port.split(":");
    } else {
      containerPort = hostPort = port;
    }

    const portKey = `${containerPort}/tcp`;
    ExposedPorts[portKey] = {};
    PortBindings[portKey] = [{ HostPort: hostPort }];
  }

  return {
    ExposedPorts,
    PortBindings
  };
}
