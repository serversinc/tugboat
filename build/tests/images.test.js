"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = require("../services/Server");
const ContainerController_1 = require("../controllers/ContainerController");
const ImageController_1 = require("../controllers/ImageController");
const GithubController_1 = require("../controllers/GithubController");
const NetworkController_1 = require("../controllers/NetworkController");
const ComposeController_1 = require("../controllers/ComposeController");
// Mock the DockerService
jest.mock('../services/Docker', () => {
    return {
        DockerService: jest.fn().mockImplementation(() => ({
            listImages: jest.fn().mockResolvedValue([
                { Id: 'img123', RepoTags: ['nginx:latest'] }
            ]),
            getImage: jest.fn().mockResolvedValue({
                Id: 'img123', RepoTags: ['nginx:latest']
            }),
            createImage: jest.fn().mockResolvedValue({}),
            pullImage: jest.fn().mockResolvedValue(undefined),
            removeImage: jest.fn().mockResolvedValue(undefined),
        })),
    };
});
const DockerService = require('../services/Docker').DockerService;
describe('Image API', () => {
    let app;
    let dockerService;
    beforeEach(() => {
        process.env.TUGBOAT_SECRET_KEY = 'test-key';
        dockerService = new DockerService();
        const containerController = new ContainerController_1.ContainerController(dockerService);
        const imageController = new ImageController_1.ImageController(dockerService);
        const githubController = new GithubController_1.GithubController();
        const networkController = new NetworkController_1.NetworkController(dockerService);
        const composeController = new ComposeController_1.ComposeController(dockerService);
        app = new Server_1.Application(containerController, imageController, githubController, networkController, composeController);
    });
    describe('GET /images', () => {
        it('should return a list of images', async () => {
            const res = await app.app.request('/images', {
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual([
                { Id: 'img123', RepoTags: ['nginx:latest'] }
            ]);
        });
    });
    describe('GET /images/:id', () => {
        it('should return an image by id', async () => {
            const res = await app.app.request('/images/img123', {
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.Id).toBe('img123');
        });
    });
});
