const { Application } = require('../build/services/Server');
const { ContainerController } = require('../build/controllers/ContainerController');
const { ImageController } = require('../build/controllers/ImageController');
const { GithubController } = require('../build/controllers/GithubController');
const { NetworkController } = require('../build/controllers/NetworkController');
const { ComposeController } = require('../build/controllers/ComposeController');
const { DockerService } = require('../build/services/Docker');

describe('Image API', () => {
  let app;
  let dockerService;
  let createdImages = [];

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
    process.env.TUGBOAT_SECRET_KEY = 'test-key';
    const containerController = new ContainerController(dockerService);
    const imageController = new ImageController(dockerService);
    const githubController = new GithubController();
    const networkController = new NetworkController(dockerService);
    const composeController = new ComposeController(dockerService);

    app = new Application(containerController, imageController, githubController, networkController, composeController);
  });

  afterEach(async () => {
    for (const id of createdImages) {
      try {
        await dockerService.removeImage(id);
      } catch (err) {
        console.warn(`Failed to remove image ${id}:`, err.message);
      }
    }
    createdImages = [];
  });

  describe('GET /images', () => {
    it('should return a list of images', async () => {
      const res = await app.app.request('/images', {
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});