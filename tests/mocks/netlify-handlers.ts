import { http, HttpResponse } from "msw";

const NETLIFY_API = "https://api.netlify.com/api/v1";

export const netlifyHandlers = [
  // POST create site
  http.post(`${NETLIFY_API}/sites`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      id: `netlify_${body.name}`,
      site_id: `netlify_${body.name}`,
      name: body.name,
      ssl_url: `https://${body.name}.netlify.app`,
    });
  }),

  // POST create deploy
  http.post(`${NETLIFY_API}/sites/:siteId/deploys`, () => {
    return HttpResponse.json({
      id: `deploy_netlify_${Date.now()}`,
      name: "test-site",
      ssl_url: "https://test-site.netlify.app",
      url: "https://test-site.netlify.app",
      required: [],
    });
  }),

  // PUT upload file
  http.put(`${NETLIFY_API}/deploys/:deployId/files/:hash`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // POST set env vars
  http.post(`${NETLIFY_API}/accounts/:accountSlug/env`, () => {
    return HttpResponse.json([]);
  }),

  // PUT update env var
  http.put(`${NETLIFY_API}/accounts/:accountSlug/env/:key`, () => {
    return HttpResponse.json({});
  }),

  // DELETE site
  http.delete(`${NETLIFY_API}/sites/:siteId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
