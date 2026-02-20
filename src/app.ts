import dotenv from "dotenv";

// Hono Server
import { startServer } from "./services/Server";

// Controllers
import { createContainerHandlers } from "./containers/handlers";
import { createImageHandlers } from "./images/handlers";

// Services
import { HeartbeatService } from "./services/Heartbeat";
import { DockerService } from "./services/Docker";

import { ensureSecretKey } from "./utils/auth";
import { checkEnv } from "./utils/env";
import { createNetworkHandlers } from "./networks/handlers";
import { WatcherService } from "./services/Watcher";

dotenv.config();

checkEnv();
ensureSecretKey();

const dockerService = new DockerService();
const watcherService = new WatcherService(dockerService);
const heartbeat = new HeartbeatService(dockerService);

watcherService.start();
heartbeat.start();

const containerHandlers = createContainerHandlers(dockerService);
const imageHandlers = createImageHandlers(dockerService);
const networkHandlers = createNetworkHandlers(dockerService);

startServer(containerHandlers, imageHandlers, networkHandlers);
