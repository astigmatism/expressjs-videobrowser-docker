# 📽️ Video Browser Application

Welcome to the **Video Browser Application**! This application allows you to upload, process, and browse videos directly in your browser, powered by a **Node.js Express server** and an **Angular-based client**. 🚀

## 🏗️ Project Structure

This repository consists of two main components:

1. **Server** - A Node.js Express application that handles media file processing, using **HandBrakeCLI** and **FFmpeg** for video transcoding and thumbnail generation.
2. **Client** - An Angular frontend served through **Nginx**, which communicates with the backend to manage video uploads and playback.

## 🚀 Features

✔️ Multi-file upload and processing 🎥  
✔️ Video transcoding via **HandBrakeCLI** 🛠️  
✔️ Thumbnail and sprite sheet generation via **FFmpeg** 🖼️  
✔️ WebSocket support for real-time updates 🔄  
✔️ Dockerized for easy deployment 🐳

---

## 📦 Installation & Deployment

### 🛠️ Running Locally

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/video-browser.git
   cd video-browser
   ```

2. Install dependencies:

   ```sh
   cd server && npm install
   cd ../client && npm install
   ```

3. Start the applications separately:

   ```sh
   # Start the backend server
   cd server
   npm start

   # Start the Angular frontend
   cd ../client
   ng serve --configuration=production
   ```

4. Access the application at:
   - **Client:** `http://localhost:4200`
   - **Server:** `http://localhost:3000`

---

## 🐳 Running with Docker

To deploy the application in a **self-contained Docker environment**, use **Docker Compose**:

### 📌 Build & Start the Containers

```sh
docker-compose up --build
```

- **Client:** Available at `http://localhost:8080`
- **Server:** Runs inside the container (not publicly exposed)

### 🔄 Stopping the Containers

```sh
docker-compose down
```

---

## ⚙️ Configuration

Environment variables are used to configure the application. Update `docker-compose.yml` as needed:

```yaml
environment:
  - NODE_ENV=production
  - CLIENT_ORIGINS=http://localhost:8080
```

---

## 📂 Managing Storage & Media Files

Since media files are stored **inside the container**, you need to be mindful of storage limits.

### 🔍 Checking Disk Usage

To see how much space your media files are taking up:

```sh
docker exec -it video-browser-server du -sh /app/media
```

### 🗑️ Clearing Old Media

To manually delete all media files:

```sh
docker exec -it video-browser-server rm -rf /app/media/*
```

### 🛠️ Persisting Media

If you want media files to **persist across container restarts**, consider using **volumes** instead of storing them inside the container:

```yaml
volumes:
  - video-storage:/app/media

volumes:
  video-storage:
```

---

## 🐛 Debugging

Here are some useful debugging steps:

### 1️⃣ Check Running Containers

```sh
docker ps
```

### 2️⃣ View Logs for the Server

```sh
docker logs -f video-browser-server
```

### 3️⃣ Check if HandBrakeCLI & FFmpeg are Installed

```sh
docker exec -it video-browser-server HandBrakeCLI --version
docker exec -it video-browser-server ffprobe -version
```

### 4️⃣ Access the Running Container

```sh
docker exec -it video-browser-server sh
```

---

## 🎉 Contributing

If you find a bug or have a suggestion, feel free to **open an issue** or submit a **pull request**. 🚀

---

## 📝 License

This project is licensed under the **MIT License**.

Happy Browsing! 🎬
