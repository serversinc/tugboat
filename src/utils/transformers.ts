/**
 * @description This file contains transformers for data from Dockerode
 */

import { ContainerInfo } from "dockerode";
import { networkInterfaces } from "os";

/**
 * Normalizes container data from Dockerode
 * @param container Container data from Dockerode
 * @returns Normalized container data
 */
export function normalizeContainer(container: ContainerInfo) {
  return {
    id: container.Id,
    name: container.Names[0],
    image: {
      name: container.Image,
      id: container.ImageID,
      tag: container.ImageID.split(":")[1],
    },
    state: container.State,
    ports: container.Ports.map(port => ({
      type: port.Type,
      ip: port.IP,
      private: port.PrivatePort,
      public: port.PublicPort,
    })),
    command: container.Command,
    created: container.Created,
    created_normalized: new Date(container.Created * 1000),
    networks: Object.keys(container.NetworkSettings.Networks).map(key => ({
      ip: container.NetworkSettings.Networks[key].IPAddress,
      name: key,
      mac_address: container.NetworkSettings.Networks[key].MacAddress,
      network_id: container.NetworkSettings.Networks[key].NetworkID,
      endpoint_id: container.NetworkSettings.Networks[key].EndpointID,
      gateway: container.NetworkSettings.Networks[key].Gateway,
      aliases: container.NetworkSettings.Networks[key].Aliases,
    })),
  }
}
