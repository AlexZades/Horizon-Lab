# HomeLab Dashboard 

**HomeLab Dashboard**! This is a 3D interactive dashboard built to help you monitor your homelab servers and web services while looking nice. 

Im vibe coded this to use on my truenas server but it should work in any homelab enviroment. Just run the docker container, add links to your services, and your done! Also suports mobile viewing.

## Features

- **3D Interactive Globe**: See your servers and client devices on a 3D globe. It shows cool animated effects related your online servers and your current device!
- **Server & Service Monitoring**: Add your servers with their IP addresses and track your homelab services. The dashboard will automatically ping them every 60 seconds to make sure everything is running smoothly.
- **Time.gov Sync**: Atomic Time baby.
- **Password Protection**: Lock your dashboard for added security.
- **Customization**: Add a custom icon for your dashboard and customize the name too!

## How to install

You can run this project locally on your machine or deploy it using Docker.

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

### Option 2: Running with Docker (Recommended)

If you dont plan to edit the software itself just install the docker container,

1. **Start the container**:
   ```bash
   docker compose up -d --build
   ```
2. **That's it!** The dashboard will be available at `http://localhost:3000`. 
   

## Configuration (Enviroment Variables)

If you want to customize a few things you can create a `.env` file in the root folder and add these options:

```env
# Require a password to view the dashboard (leave empty for public access)
DASHBOARD_PASSWORD=my-super-secret-password

# Change where the database file is saved
DATABASE_DIR=./data
```

## TS
- **Next.js** & **React** (App Router)
- **Tailwind CSS** & **shadcn/ui** for the  styling
- **Three.js** & **React Three Fiber** for the 3D globe
- **Lowdb** database
Enjoy monitoring your homelab! 🌍
