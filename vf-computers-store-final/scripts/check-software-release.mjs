import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const softwareDir = path.join(projectRoot, "public", "software");
const manifestPath = path.join(softwareDir, "v-f-browser-update.json");
const storefrontPath = path.join(projectRoot, "src", "main.jsx");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const installers = (await readdir(softwareDir)).filter((name) =>
  name.toLowerCase().endsWith(".exe"),
);

if (installers.length !== 1) {
  throw new Error(
    `Expected exactly one Windows installer in public/software, found ${installers.length}: ${installers.join(", ")}`,
  );
}

const [installer] = installers;
if (installer !== manifest.fileName) {
  throw new Error(
    `Installer ${installer} does not match update manifest fileName ${manifest.fileName}`,
  );
}

const expectedUrlSuffix = `/software/${installer}`;
if (!String(manifest.url).endsWith(expectedUrlSuffix)) {
  throw new Error(
    `Update manifest URL must end with ${expectedUrlSuffix}; received ${manifest.url}`,
  );
}

const installerPath = path.join(softwareDir, installer);
const installerSize = (await stat(installerPath)).size;
if (installerSize !== manifest.fileSize) {
  throw new Error(
    `Installer size ${installerSize} does not match update manifest fileSize ${manifest.fileSize}`,
  );
}

const hash = createHash("sha256");
for await (const chunk of createReadStream(installerPath)) {
  hash.update(chunk);
}
const installerSha256 = hash.digest("hex");
if (installerSha256 !== String(manifest.sha256).toLowerCase()) {
  throw new Error(
    `Installer SHA-256 ${installerSha256} does not match update manifest sha256 ${manifest.sha256}`,
  );
}

const storefrontSource = await readFile(storefrontPath, "utf8");
if (!storefrontSource.includes(expectedUrlSuffix)) {
  throw new Error(`Storefront download link must reference ${expectedUrlSuffix}`);
}

console.log(`Software release check passed: ${installer} (${installerSize} bytes)`);
