import dotenv from "dotenv";

import { createContainerHandlers } from "./controllers/containers";
import { createNetworkHandlers } from "./controllers/networks";
import { createImageHandlers } from "./controllers/images";

import { startServer } from "./services/Server";
import { DockerService } from "./services/Docker";
import { WatcherService } from "./services/Watcher";

import config, { assertRequireEnvs } from "./config";

dotenv.config({ path: config.ENV_PATH });

// Validate required envs early (includes SECRET_KEY)
assertRequireEnvs();

const dockerService  = new DockerService(config.DOCKER_SOCKET);
const watcherService = new WatcherService(dockerService);

watcherService.start();

const containerHandlers = createContainerHandlers(dockerService);
const imageHandlers     = createImageHandlers(dockerService);
const networkHandlers   = createNetworkHandlers(dockerService);

startServer(containerHandlers, imageHandlers, networkHandlers, config.PORT);
