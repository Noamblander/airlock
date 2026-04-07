import { http, HttpResponse } from "msw";

export const vercelHandlers = [
  // GET project by name
  http.get("https://api.vercel.com/v9/projects/:name", ({ params }) => {
    return HttpResponse.json({
      id: `prj_${params.name}`,
      name: params.name,
    });
  }),

  // POST create project
  http.post("https://api.vercel.com/v11/projects", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      id: `prj_${body.name}`,
      name: body.name,
    });
  }),

  // POST create deployment
  http.post("https://api.vercel.com/v13/deployments", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      id: `dpl_vercel_${Date.now()}`,
      url: `${body.name}-test.vercel.app`,
      readyState: "READY",
    });
  }),

  // POST set env vars
  http.post("https://api.vercel.com/v10/projects/:projectId/env", () => {
    return HttpResponse.json({ created: true });
  }),

  // DELETE deployment
  http.delete("https://api.vercel.com/v13/deployments/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
