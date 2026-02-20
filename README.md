# Agent

## Features

- 💚 Health check
- 🚢 Container management

## Setup

1. Pull the latest image from Docker Hub:

```bash
docker pull serversinc/agent
```

2. Create a `.env` file by copying the example and filling in required values:

```bash
cp .env.example .env
# Edit .env and set CORE_URL and SECRET_KEY
```

3. Run the image (example):

```bash
docker run -d -p 7567:7567 --env-file /agent/.env serversinc/agent
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
- `CORE_URL`: The URL to which the agent will send events. See `.env.example` for a full list of environment variables and defaults.

## Contributing

Ensure you have a `agent` folder in your home directory, or set the `HOME` environment variable to point to your Agent directory.

1. Fork the repository
2. Create a new branch (`git checkout -b feature`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push to the branch (`git push origin feature`)
5. Create a new pull request
