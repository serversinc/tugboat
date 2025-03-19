import dotenv from "dotenv";

// Hono Server
import { Application } from "./services/Server";

// Controllers
import { ContainerController } from "./controllers/ContainerController";

// Services
import { DockerService } from "./services/Docker";
import { HeartbeatService } from "./services/Heartbeat";
import { checkEnv } from "./utils/env";
import { ImageController } from "./controllers/ImageController";

dotenv.config();
checkEnv();

const dockerService = new DockerService();
const heartbeat = new HeartbeatService(dockerService);

// Start phone home interval
if (process.env.TUGBOAT_PHONE_HOME_INTERVAL && process.env.TUGBOAT_PHONE_HOME_URL) {
  heartbeat.start();
}

const containerController = new ContainerController(dockerService);
const imageController = new ImageController(dockerService);

const application = new Application(containerController, imageController);

application.start();
