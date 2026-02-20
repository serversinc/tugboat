import dotenv from "dotenv";


import { createContainerHandlers } from "./controllers/containers";
import { createNetworkHandlers } from "./controllers/networks";
import { createImageHandlers } from "./controllers/images";

import { startServer } from "./services/Server";
import { DockerService } from "./services/Docker";
import { WatcherService } from "./services/Watcher";

import { ensureSecretKey } from "./utils/auth";
import { checkEnv } from "./utils/env";

dotenv.config();

checkEnv();
ensureSecretKey();

const dockerService  = new DockerService();
const watcherService = new WatcherService(dockerService);

watcherService.start();

const containerHandlers = createContainerHandlers(dockerService);
const imageHandlers     = createImageHandlers(dockerService);
const networkHandlers   = createNetworkHandlers(dockerService);

startServer(containerHandlers, imageHandlers, networkHandlers);
