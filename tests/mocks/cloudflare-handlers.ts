import { http, HttpResponse } from "msw";

const CF_API = "https://api.cloudflare.com/client/v4";

export const cloudflareHandlers = [
  // GET project by name
  http.get(`${CF_API}/accounts/:accountId/pages/projects/:name`, ({ params }) => {
    return HttpResponse.json({
      result: {
        name: params.name,
      },
      success: true,
    });
  }),

  // POST create project
  http.post(`${CF_API}/accounts/:accountId/pages/projects`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      result: {
        name: body.name,
      },
      success: true,
    });
  }),

  // POST create deployment
  http.post(`${CF_API}/accounts/:accountId/pages/projects/:name/deployments`, ({ params }) => {
    return HttpResponse.json({
      result: {
        id: `cf_deploy_${Date.now()}`,
        url: `https://${params.name}.pages.dev`,
      },
      success: true,
    });
  }),

  // PATCH set env vars
  http.patch(`${CF_API}/accounts/:accountId/pages/projects/:name`, () => {
    return HttpResponse.json({
      result: {},
      success: true,
    });
  }),

  // DELETE project
  http.delete(`${CF_API}/accounts/:accountId/pages/projects/:name`, () => {
    return HttpResponse.json({ result: null, success: true });
  }),
];
