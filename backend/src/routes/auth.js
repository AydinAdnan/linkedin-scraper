import { config } from "../config.js";

export default async function authRoutes(app) {
  app.get(
    "/auth/status",
    {
      schema: {
        description: "Check whether a LinkedIn session is configured",
        response: { 200: { type: "object", properties: { loggedIn: { type: "boolean" } } } },
      },
    },
    async () => ({ loggedIn: Boolean(config.liAt && config.jsessionid) })
  );
}
