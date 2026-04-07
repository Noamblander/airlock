import { http, HttpResponse } from "msw";

const AWS_AMPLIFY_URL = "https://amplify.us-east-1.amazonaws.com";

export const awsHandlers = [
  // POST create app
  http.post(`${AWS_AMPLIFY_URL}/apps`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      app: {
        appId: `aws_${body.name}`,
        name: body.name,
      },
    });
  }),

  // POST create branch
  http.post(`${AWS_AMPLIFY_URL}/apps/:appId/branches`, () => {
    return HttpResponse.json({ branch: { branchName: "main" } });
  }),

  // POST create deployment
  http.post(`${AWS_AMPLIFY_URL}/apps/:appId/branches/:branch/deployments`, ({ params }) => {
    return HttpResponse.json({
      jobSummary: {
        jobId: `job_aws_${Date.now()}`,
      },
    });
  }),

  // POST update app (env vars)
  http.post(`${AWS_AMPLIFY_URL}/apps/:appId`, () => {
    return HttpResponse.json({ app: { appId: "updated" } });
  }),

  // DELETE app
  http.delete(`${AWS_AMPLIFY_URL}/apps/:appId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
