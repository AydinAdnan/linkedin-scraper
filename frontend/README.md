# LinkedIn Profile API — frontend

React + Vite + Tailwind v4, [Watermelon UI](https://ui.watermelon.sh) components, Framer Motion.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Set `VITE_API_URL` to the backend base URL (see `.env.example`). Defaults to
`http://localhost:4000`.

The backend needs a live LinkedIn session: run `npm run login` in `../backend`,
then restart the backend so it picks up the new cookies from `.env`. Until then
`/auth/status` reports `loggedIn: false` and profile requests return 401.

Deploy to Vercel as-is (framework preset: Vite, no extra config) with
`VITE_API_URL` set in the project's environment variables.
