export function parsePortString(ports: string[]): { [key: string]: {} } {
  if (!ports || ports.length === 0) {
    return {};
  }

  const ExposedPorts: { [key: string]: {} } = {};
  const PortBindings: { [key: string]: { HostPort: string }[] } = {};

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

    if (PortBindings[portKey]) {
      PortBindings[portKey].push({ HostPort: hostPort });
    } else {
      PortBindings[portKey] = [{ HostPort: hostPort }];
    }
  }

  return {
    ExposedPorts,
    HostConfig: {
      PortBindings,
    },
  };
}
