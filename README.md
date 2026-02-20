# Agent



## Features

- 💚 Health check
- 🚢 Container management

## Setup

1. Pull the latest image from Docker Hub:

```bash
docker pull serversinc/agent
```

2. Create a `.env` file in the `./agent` directory with the following content:

```env
PORT=7567
SECRET_KEY=your_secret_key
CORE_URL=http://your_server:your_port/events
DOCKER_PLATFORM=unix
```

3. Run the image:

```bash
docker run -d -p 7567:7567 serversinc/agent --env-file /agent/.env
```

## Usage

### Fetch health status

```bash
curl -X GET http://localhost:7567/v1/health
```

### Fetch all containers

```bash
curl -X GET http://localhost:7567/v1/containers
```

### Fetch a container by ID

```bash
curl -X GET http://localhost:7567/v1/containers/:id
```

## Environment variables

- `PORT`: Listening port for the agent
- `SECRET_KEY`: The secret key for authenticating requests to the agent
- `CORE_URL`: The URL to which the agent will send events.
- `ENABLE_HEARTBEAT`: Set to `false` to disable heartbeat functionality. Defaults to enabled if `CORE_URL` is set.
- `HOME`: The path to the Agent directory on your host machine. This is where the agent will store its data.

## Contributing

Ensure you have a `agent` folder in your home directory, or set the `HOME` environment variable to point to your Tugboat directory.

1. Fork the repository
2. Create a new branch (`git checkout -b feature`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push to the branch (`git push origin feature`)
5. Create a new pull request
