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

async function checkPositioningRules() {
  const homepage = resolve(siteRoot, "index.html");
  const html = await readFile(homepage, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1].trim();
  if (!title) {
    errors.push("index.html: missing page title");
  } else if (title.length > 60) {
    errors.push(`index.html: title is ${title.length} characters; it must be 60 or fewer`);
  }

  const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const metaDescription = descriptionMatch?.[1];
  if (!metaDescription) {
    errors.push("index.html: missing meta description");
  } else if (metaDescription.length > 160) {
    errors.push(`index.html: meta description is ${metaDescription.length} characters; it must be 160 or fewer`);
  }

  const jsonLd = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
  if (!jsonLd) {
    errors.push("index.html: missing JSON-LD");
  } else {
    try {
      JSON.parse(jsonLd);
    } catch (error) {
      errors.push(`index.html: invalid JSON-LD (${error.message})`);
    }
  }

  for (const htmlFile of htmlFiles) {
    const pageHtml = await readFile(htmlFile, "utf8");
    const publicHtml = pageHtml
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/\b(?:src|srcset)\s*=\s*(["'])[^"']*\1/gi, "");

    if (/naisettevõt|teejuht/i.test(publicHtml)) {
      errors.push(`${displayPath(htmlFile)}: public copy or metadata still contains retired positioning terminology`);
    }
    if (/\s-\s/.test(publicHtml)) {
      errors.push(`${displayPath(htmlFile)}: visible spaced hyphen separator found; use an en dash instead`);
    }
    if (publicHtml.includes("—")) {
      errors.push(`${displayPath(htmlFile)}: em dash found; public HTML uses en dashes instead`);
    }
  }

  const firstFaq = html.match(/<div class=["']faq-list["'][^>]*>\s*<details([^>]*)>([\s\S]*?)<\/details>/i);
  if (!firstFaq || !/Kas ma pean olema ettevõtja\?/.test(firstFaq[2])) {
    errors.push("index.html: missing first FAQ entry for non-entrepreneurs");
  } else if (/\bopen\b/i.test(firstFaq[1])) {
    errors.push("index.html: first FAQ entry must be collapsed by default");
  }
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
await checkPositioningRules();

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
