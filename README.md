# HomeLab Dashboard

A beautiful, 3D interactive dashboard for monitoring your homelab servers and services. Built with Next.js, React Three Fiber, Tailwind CSS, and a lightweight JSON database (`lowdb`).

## ✨ Features

- **3D Interactive Globe**: Visualizes your servers and client device in real-time. Displays animated rainbow traffic streams between online servers, and between the dashboard host and your current device.
- **Server Management**: Add servers with geographic coordinates (Lat/Lng) and IP addresses for uptime monitoring. Designate one server as the "Dashboard Host".
- **Service Monitoring**: Track the status of your homelab services (e.g., Plex, Grafana). Assign services to specific host servers, and see them grouped in the UI.
- **Uptime Polling**: Automatically checks service HTTP endpoints and server TCP reachability every 60 seconds.
- **Time.gov Synchronization**: Includes a sleek clock and weekday widget synced directly with NIST's authoritative time.gov API.
- **Password Protection**: Secure your dashboard behind an animated lock screen using a simple environment variable.
- **Custom Branding**: Upload your own custom logo/icon for the dashboard header right from the settings page.
- **Docker Ready**: Fully containerized for easy deployment on any Docker host or platform like Dyad.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher (v22 recommended)
- **Yarn** or **npm**
- **Docker** (optional, for containerized deployment)

### Environment Variables
Copy `.env.example` to `.env` (or set these in your deployment environment):

```env
# Optional: Require a password to view the dashboard
DASHBOARD_PASSWORD=your-secure-password

# Optional: Override the time.gov source used by the clock widgets
TIME_GOV_API_URL=https://time.gov/

# Optional: Define where the JSON database is stored
DATABASE_DIR=./data
```

### Local Development

1. **Install Dependencies**:
   ```bash
   yarn install
   ```

2. **Run the Development Server**:
   ```bash
   yarn dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🐳 Docker Deployment

The application includes a `Dockerfile` and `docker-compose.yml` for easy containerization.

1. **Build and Run with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

2. **Persistent Data**:
   The Docker Compose setup mounts a volume (`dyad_db_data`) to `/app/data` inside the container. This ensures your `db.json` (servers, services, and settings) persists across container restarts.

## 🛠️ Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **3D Visualization**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- **Database**: [Lowdb](https://github.com/typicode/lowdb) (Local JSON file)
- **Icons**: [Lucide React](https://lucide.dev/)
