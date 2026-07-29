import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const errors = [];
const anchorCache = new Map();

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...await collectFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function displayPath(path) {
  return relative(siteRoot, path).split(sep).join("/");
}

function isExternalReference(reference) {
  return /^[a-z][a-z\d+.-]*:/i.test(reference) || reference.startsWith("//");
}

function resolveLocalReference(sourceFile, reference) {
  const [pathAndQuery, fragment = ""] = reference.split("#", 2);
  const encodedPath = pathAndQuery.split("?", 1)[0];
  const decodedPath = decodeURIComponent(encodedPath);
  const targetPath = !decodedPath
    ? sourceFile
    : decodedPath.startsWith("/")
      ? resolve(siteRoot, `.${decodedPath}`)
      : resolve(dirname(sourceFile), decodedPath);

  return { targetPath, fragment };
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getAnchors(htmlFile) {
  if (anchorCache.has(htmlFile)) return anchorCache.get(htmlFile);

  const html = await readFile(htmlFile, "utf8");
  const anchors = new Set(
    [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)]
      .map((match) => match[1])
  );

  anchorCache.set(htmlFile, anchors);
  return anchors;
}

async function checkReference(sourceFile, reference) {
  if (!reference || isExternalReference(reference)) return;

  let target;
  try {
    target = resolveLocalReference(sourceFile, reference);
  } catch {
    errors.push(`${displayPath(sourceFile)}: invalid local reference "${reference}"`);
    return;
  }

  const relativeTarget = relative(siteRoot, target.targetPath);
  if (relativeTarget.startsWith("..") || resolve(siteRoot, relativeTarget) !== target.targetPath) {
    errors.push(`${displayPath(sourceFile)}: reference escapes the site root: "${reference}"`);
    return;
  }

  const exists = await fileExists(target.targetPath);
  if (!exists) {
    errors.push(`${displayPath(sourceFile)}: missing file "${reference}"`);
    return;
  }

  if (target.fragment && extname(target.targetPath).toLowerCase() === ".html") {
    const anchors = await getAnchors(target.targetPath);
    if (!anchors.has(decodeURIComponent(target.fragment))) {
      errors.push(`${displayPath(sourceFile)}: missing anchor "${reference}"`);
    }
  }
}

async function checkHtmlFile(htmlFile) {
  const html = await readFile(htmlFile, "utf8");
  const references = [
    ...[...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)]
      .map((match) => match[1]),
    ...[...html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)]
      .flatMap((match) => match[1]
        .split(",")
        .map((candidate) => candidate.trim().split(/\s+/, 1)[0]))
  ];

  await Promise.all(references.map((reference) => checkReference(htmlFile, reference)));
  return references.filter((reference) => !isExternalReference(reference)).length;
}

function checkJavaScriptFile(javaScriptFile) {
  const result = spawnSync(process.execPath, ["--check", javaScriptFile], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    errors.push(`${displayPath(javaScriptFile)}: JavaScript syntax error\n${detail}`);
  }
}

const files = await collectFiles(siteRoot);
const htmlFiles = files.filter((file) => extname(file).toLowerCase() === ".html");
const javaScriptFiles = files.filter((file) => [".js", ".mjs"].includes(extname(file).toLowerCase()));
const referenceCounts = await Promise.all(htmlFiles.map(checkHtmlFile));

javaScriptFiles.forEach(checkJavaScriptFile);

if (errors.length > 0) {
  console.error(`Smoke check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const referenceCount = referenceCounts.reduce((total, count) => total + count, 0);
  console.log(
    `Smoke check passed: ${htmlFiles.length} HTML files, ` +
    `${referenceCount} local references, and ${javaScriptFiles.length} JavaScript files.`
  );
}
