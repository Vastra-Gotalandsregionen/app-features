#!/usr/bin/env node
// Checks every flag's minAppVersion against how that app's builds are
// actually versioned (schema/app_versions.json). The JSON schema can only
// check the shape ("major.minor.patch"); this catches values that are valid
// semver but can never gate correctly, e.g. "1.5.0" for an app whose
// production builds are versioned by date (26.10.21), where it always passes.
//
// Usage: node scripts/check-versions.mjs features/<app>/feature_flags.<env>.json ...
// Exits 1 if any value is wrong.

import { readFileSync } from "node:fs";

const SCHEMES_PATH = new URL("../schema/app_versions.json", import.meta.url);
const FILE_PATTERN = /(?:^|\/)features\/([^/]+)\/feature_flags\.(dev|prod)\.json$/;

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? m.slice(1).map(Number) : null;
};

const compare = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

// "date": yy.M.d with a two-digit year and a real calendar date. Zero padding
// is optional; the apps compare the parts as numbers.
function checkDate(value) {
  const m = /^(\d{2})\.(\d{1,2})\.(\d{1,2})$/.exec(value);
  if (!m) {
    const hint = parse(value) && Number(value.split(".")[0]) < 20
      ? ` "${value}" looks like a release number; builds are versioned by date (e.g. 26.10.21), so it would always pass.`
      : "";
    return `expected a build date yy.MM.dd, e.g. "26.11.05".${hint}`;
  }
  const [yy, mm, dd] = m.slice(1).map(Number);
  const date = new Date(Date.UTC(2000 + yy, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) {
    return `"${value}" is not a real date (yy.MM.dd).`;
  }
  return null;
}

// "fixed": every build has the same version, so a higher value hides the
// flag on every build and a lower one can't tell builds apart.
function checkFixed(value, fixed) {
  const v = parse(value);
  if (!v) return `expected major.minor.patch.`;
  if (compare(v, parse(fixed)) > 0) {
    return `"${value}" is above ${fixed}, the version every build carries, so the flag would never show. Use "0.0.0".`;
  }
  return null;
}

function checkSemver(value) {
  return parse(value) ? null : `expected major.minor.patch.`;
}

function loadSchemes() {
  const { apps } = JSON.parse(readFileSync(SCHEMES_PATH, "utf8"));
  const errors = [];
  for (const [app, platforms] of Object.entries(apps)) {
    for (const [platform, envs] of Object.entries(platforms)) {
      for (const [env, rule] of Object.entries(envs)) {
        const where = `schema/app_versions.json: ${app}.${platform}.${env}`;
        if (!["date", "fixed", "semver"].includes(rule.scheme)) {
          errors.push(`${where}: unknown scheme "${rule.scheme}"`);
        } else if (rule.scheme === "fixed" && !parse(rule.version ?? "")) {
          errors.push(`${where}: "fixed" needs a "version" in major.minor.patch`);
        }
      }
    }
  }
  return { apps, errors };
}

function checkFile(path, apps) {
  const match = FILE_PATTERN.exec(path);
  if (!match) return [`${path}: not a features/<app>/feature_flags.<dev|prod>.json file`];
  const [, app, env] = match;

  const platforms = apps[app];
  if (!platforms) {
    return [`${path}: app "${app}" has no entry in schema/app_versions.json; declare how its builds are versioned`];
  }

  const { flags = {} } = JSON.parse(readFileSync(path, "utf8"));
  const errors = [];
  for (const [id, flag] of Object.entries(flags)) {
    for (const [platform, envs] of Object.entries(platforms)) {
      const rule = envs[env];
      const value = flag.minAppVersion?.[platform];
      if (!rule || typeof value !== "string") continue; // shape is the JSON schema's job
      const error =
        rule.scheme === "date" ? checkDate(value)
        : rule.scheme === "fixed" ? checkFixed(value, rule.version)
        : checkSemver(value);
      if (error) errors.push(`${path}: ${id}.minAppVersion.${platform}: ${error}`);
    }
  }
  return errors;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: check-versions.mjs <flag file> ...");
  process.exit(2);
}

const { apps, errors } = loadSchemes();
for (const file of files) errors.push(...checkFile(file, apps));

if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log(`minAppVersion ok in ${files.length} file(s)`);
