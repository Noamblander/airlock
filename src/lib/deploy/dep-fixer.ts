import type { Framework } from "./types";

type VersionRule = {
  pkg: string;
  condition: (deps: Record<string, string>, devDeps: Record<string, string>) => boolean;
  fix: string;
  target: "dependencies" | "devDependencies";
};

/**
 * Extracts the major version number from a semver-ish string.
 * Returns NaN for unparseable values (e.g. "latest", "*").
 */
function majorOf(ver: string): number {
  const clean = ver.replace(/^[\^~>=<]*/, "");
  return parseInt(clean.split(".")[0], 10);
}

/**
 * Returns true if the version string resolves to something strictly
 * below the given major.minor. Handles ^, ~, and bare versions.
 * Conservative: returns false (skip fix) for unparseable values.
 */
function isBelow(ver: string, major: number, minor: number): boolean {
  const clean = ver.replace(/^[\^~>=<]*/, "");
  const parts = clean.split(".").map(Number);
  if (isNaN(parts[0])) return false;
  if (parts[0] < major) return true;
  if (parts[0] === major && (parts[1] ?? 0) < minor) return true;
  return false;
}

function isMajorBelow(ver: string, major: number): boolean {
  const m = majorOf(ver);
  return !isNaN(m) && m < major;
}

const RULES: VersionRule[] = [
  {
    pkg: "next",
    condition: (deps) => !!deps["next"] && isBelow(deps["next"], 16, 2),
    fix: "16.2.2",
    target: "dependencies",
  },
  {
    pkg: "react",
    condition: (deps, _dev) => !!deps["react"] && isMajorBelow(deps["react"], 19),
    fix: "^19",
    target: "dependencies",
  },
  {
    pkg: "react-dom",
    condition: (deps) => !!deps["react-dom"] && isMajorBelow(deps["react-dom"], 19),
    fix: "^19",
    target: "dependencies",
  },
  {
    pkg: "lucide-react",
    condition: (deps) => {
      if (!deps["lucide-react"]) return false;
      const reactMajor = majorOf(deps["react"] || "0");
      return reactMajor >= 19 && isMajorBelow(deps["lucide-react"], 1);
    },
    fix: "^1.8.0",
    target: "dependencies",
  },
  {
    pkg: "tailwindcss",
    condition: (_deps, devDeps) =>
      !!devDeps["tailwindcss"] && isBelow(devDeps["tailwindcss"], 3, 4),
    fix: "^3.4.1",
    target: "devDependencies",
  },
];

/**
 * Parses package.json from the file map, applies minimum-version rules
 * to prevent known build failures, and returns the patched file map.
 */
export function fixDependencies(
  files: Record<string, string>,
  _framework: Framework
): Record<string, string> {
  if (!files["package.json"]) return files;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(files["package.json"]);
  } catch {
    return files;
  }

  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  let patched = false;

  for (const rule of RULES) {
    if (rule.condition(deps, devDeps)) {
      if (rule.target === "dependencies") {
        deps[rule.pkg] = rule.fix;
      } else {
        devDeps[rule.pkg] = rule.fix;
      }
      patched = true;
    }
  }

  if (!patched) return files;

  pkg.dependencies = deps;
  pkg.devDependencies = devDeps;

  return {
    ...files,
    "package.json": JSON.stringify(pkg, null, 2),
  };
}
