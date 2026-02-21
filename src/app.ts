import { createContainerHandlers } from "./controllers/containers";
import { createNetworkHandlers } from "./controllers/networks";
import { createImageHandlers } from "./controllers/images";

import { startServer } from "./services/Server";
import { DockerService } from "./services/Docker";
import { WatcherService } from "./services/Watcher";

import config from "./config";

const dockerService  = new DockerService(config.DOCKER_SOCKET);
const watcherService = new WatcherService(dockerService);

watcherService.start();

const containerHandlers = createContainerHandlers(dockerService);
const imageHandlers     = createImageHandlers(dockerService);
const networkHandlers   = createNetworkHandlers(dockerService);

startServer(containerHandlers, imageHandlers, networkHandlers, config.PORT);
