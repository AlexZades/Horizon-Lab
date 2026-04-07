# HomeLab Dashboard 🚀

Welcome to **HomeLab Dashboard**! This is a beautiful, 3D interactive dashboard built to help you monitor your homelab servers and services in style. 

Whether you're hosting Plex, Grafana, or just keeping track of a few Raspberry Pis, this dashboard gives you a clean overview of what's online and offline, complete with a slick 3D spinning globe that visualizes traffic between your devices.

## ✨ What's inside?

- **3D Interactive Globe**: See your servers and client devices on a 3D globe. It shows cool animated rainbow traffic streams between your online servers and your current device!
- **Server & Service Monitoring**: Add your servers with their IP addresses and track your homelab services. The dashboard will automatically ping them every 60 seconds to make sure everything is running smoothly.
- **Time.gov Sync**: Always know the exact time with a sleek clock widget synced straight to NIST's authoritative time.gov.
- **Password Protection**: Want to keep your dashboard private? You can easily lock it behind a password screen.
- **Custom Branding**: Make it yours by uploading a custom logo straight from the settings page!

## 🛠️ How to install it

You can run this project locally on your machine or deploy it using Docker (which is super easy!).

### Option 1: Running locally (for development)

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher works best).

1. **Clone the project** and open the folder in your terminal.
2. **Install the dependencies**:
   ```bash
   yarn install
   # or if you prefer npm: npm install
   ```
3. **Start the development server**:
   ```bash
   yarn dev
   # or npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser. You're good to go!

### Option 2: Running with Docker (Recommended for production)

If you just want to get it running 24/7 on your home server, Docker is the way to go. We've included everything you need.

1. **Start the container**:
   ```bash
   docker compose up -d --build
   ```
2. **That's it!** The dashboard will be available at `http://localhost:3000`. 
   
*Note: The Docker setup automatically saves your settings and servers to a `data` folder so you won't lose anything if the container restarts.*

## ⚙️ Configuration (Optional)

If you want to customize a few things under the hood, you can create a `.env` file in the root folder and add these options:

```env
# Require a password to view the dashboard (leave empty for public access)
DASHBOARD_PASSWORD=my-super-secret-password

# Change where the database file is saved
DATABASE_DIR=./data
```

## 💻 Tech Stack

For the nerds out there, here's what powers this dashboard:
- **Next.js** & **React** (App Router)
- **Tailwind CSS** & **shadcn/ui** for the beautiful styling
- **Three.js** & **React Three Fiber** for the 3D globe
- **Lowdb** for a simple, lightweight local JSON database

Enjoy monitoring your homelab! 🌍