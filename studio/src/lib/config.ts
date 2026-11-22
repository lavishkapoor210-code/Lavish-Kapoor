import "server-only";
import path from "node:path";

/** Root folder that holds one sub-folder per project. Kept out of git (personal media). */
export const PROJECTS_DIR = path.resolve(
  /*turbopackIgnore: true*/
  process.env.STUDIO_PROJECTS_DIR ?? path.join(process.cwd(), "..", "projects"),
);
