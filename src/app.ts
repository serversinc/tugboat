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

dotenv.config();

checkEnv();
ensureSecretKey();

const dockerService = new DockerService();
const heartbeat = new HeartbeatService(dockerService);

// Start phone home interval
if (process.env.TUGBOAT_PHONE_HOME_INTERVAL !== null && process.env.TUGBOAT_PHONE_HOME_URL !== null) {
  heartbeat.start();
}

const containerController = new ContainerController(dockerService);
const imageController = new ImageController(dockerService);
const githubController = new GithubController();
const networkController = new NetworkController(dockerService);

const application = new Application(containerController, imageController, githubController, networkController);

application.start();
