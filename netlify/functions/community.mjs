// Netlify Function serving the optional community API at /api/community/* (see netlify.toml).
// All behavior lives in server/serverless.mjs so it is shared with the Express server and tested.
import { createCommunityHandler } from '../../server/serverless.mjs';

export const handler = createCommunityHandler();
