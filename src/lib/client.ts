import { treaty } from "@elysiajs/eden";
import type { App } from "../app/api/[[...slugs]]/route";

// .api to enter /api prefix
const API_BASE_URL = process.env.VERCEL_URL || "http://localhost:3000";
export const client = treaty<typeof App>(API_BASE_URL).api;
