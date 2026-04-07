import { setupServer } from "msw/node";
import { vercelHandlers } from "./vercel-handlers";
import { awsHandlers } from "./aws-handlers";
import { cloudflareHandlers } from "./cloudflare-handlers";
import { netlifyHandlers } from "./netlify-handlers";

export const server = setupServer(
  ...vercelHandlers,
  ...awsHandlers,
  ...cloudflareHandlers,
  ...netlifyHandlers
);
