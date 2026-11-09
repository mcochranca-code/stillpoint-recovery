// Vercel Function (Node.js runtime) serving the optional community API at /api/community/*.
// vercel.json rewrites /api/community/<rest> here as /api/community?__path=<rest>; the handler
// maps it back onto the Express router. All behavior lives in server/serverless.mjs, shared
// with the Netlify Function and the standalone server, and covered by server/serverless.test.mjs.
import { createVercelCommunityHandler } from '../server/serverless.mjs';

export default createVercelCommunityHandler();
