# Sure Shot

A **Local-First** Messaging Application.

## Setup

1. **Configure environment variables (optional)**:
   ```bash
   # Copy the environment example file
   cp .env.example .env.local
   
   # Edit .env.local to set your preferred server URLs
   ```

2. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   pnpm install
   ```

## Usage

``` bash
# Start HTTP server (port 8000)
cd ./server
cargo install
cargo run

# Start the frontend (in a new terminal)
cd ..
pnpm dev
```
Then, open http://localhost:3000 to get started!

## Features

* Transfer text, images, files... any kind of data!
* Works **locally only**
* **Extremely** fast
* Cross-platform

## How it works

<img src="public/readme_1.png">

## Demo

<img src="public/readme_2.png">