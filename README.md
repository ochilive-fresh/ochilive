# Ochi Live frontend

## Deploy to Vercel

Import the frontend repository into Vercel. The repository root is the Vite project root; use `npm run build` as the build command and `dist` as the output directory. `vercel.json` rewrites client-side routes to `index.html`, so refreshing a valid nested route does not return a host-level 404.

After deploying the backend to Render, set these Vercel environment variables for Production (and Preview if needed), then redeploy:

- `VITE_API_URL`: the Render backend URL followed by `/api`, for example `https://your-backend.onrender.com/api`.
- `VITE_SOCKET_URL`: the Render backend origin without a path, for example `https://your-backend.onrender.com`.

The same values can be placed in a local `.env` file using `.env.example` as a template. Vite embeds `VITE_*` values into the client bundle; never put secrets in them.

## Local development

Install dependencies with `npm ci`, then run `npm run dev`. The Vite development proxy forwards `/api` and `/socket.io` to `BACKEND_URL`, which defaults to `http://localhost:5000`.
