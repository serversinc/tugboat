import dotenv from "dotenv";

// Hono Server
import { Application } from "./services/Server";

// Controllers
import { ContainerController } from "./controllers/ContainerController";
import { GithubController } from "./controllers/GithubController";
import { ImageController } from "./controllers/ImageController";

// Services
import { HeartbeatService } from "./services/Heartbeat";
import { DockerService } from "./services/Docker";

import { ensureSecretKey } from "./utils/auth";
import { checkEnv } from "./utils/env";
import { NetworkController } from "./controllers/NetworkController";
import { WatcherService } from "./services/Watcher";

dotenv.config();

checkEnv();
ensureSecretKey();

const dockerService = new DockerService();
const watcherService = new WatcherService(dockerService);
const heartbeat = new HeartbeatService(dockerService);

watcherService.start();
heartbeat.start();

const containerController = new ContainerController(dockerService);
const networkController = new NetworkController(dockerService);
const imageController = new ImageController(dockerService);
const githubController = new GithubController();

const application = new Application(containerController, imageController, githubController, networkController);

application.start();
