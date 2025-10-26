const { Application } = require("../build/services/Server");
const { ContainerController } = require("../build/controllers/ContainerController");
const { ImageController } = require("../build/controllers/ImageController");
const { GithubController } = require("../build/controllers/GithubController");
const { NetworkController } = require("../build/controllers/NetworkController");
const { ComposeController } = require("../build/controllers/ComposeController");
const { DockerService } = require("../build/services/Docker");
const fs = require("fs");
const path = require("path");

describe("GitHub API", () => {
  let app;
  let dockerService;
  let createdDirs = [];

  beforeAll(async () => {
    try {
      dockerService = new DockerService();
      await dockerService.docker.ping();
    } catch (err) {
      throw new Error('Docker not available: ' + err.message);
    }
  });

  beforeEach(() => {
    if (!dockerService) return;
    process.env.TUGBOAT_SECRET_KEY = "test-key";
    const containerController = new ContainerController(dockerService);
    const imageController = new ImageController(dockerService);
    const githubController = new GithubController();
    const networkController = new NetworkController(dockerService);
    const composeController = new ComposeController(dockerService);

    app = new Application(containerController, imageController, githubController, networkController, composeController);
  });

  afterEach(() => {
    // Clean up created directories
    createdDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true });
      }
    });
    createdDirs = [];
  });

  describe("POST /github/pull", () => {
    it("should pull a repository from GitHub", async () => {

      // Use a public repo for testing, no token needed for public
      const payload = {
        repo: "sst/open-next",
        branch: "main",
        token: "dummy",
      };

      const res = await app.app.request("/github/pull", {
        method: "POST",
        headers: {
          "x-auth-key": "test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      expect(data.success).toBe(true);

      const targetDir = path.resolve(process.cwd(), "../tugboat", payload.repo);
      createdDirs.push(targetDir);
    });
  });
});
