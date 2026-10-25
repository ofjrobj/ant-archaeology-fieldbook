import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "style.css",
  "art.js",
  "story.js",
  "simulation.js",
  "game.js",
];
const source = Object.fromEntries(
  await Promise.all(
    files.map(async (filename) => [
      filename,
      await readFile(path.join(root, filename), "utf8"),
    ]),
  ),
);
const assetTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
]);
const assetDirectory = path.join(root, "assets");
const assetInfo = await lstat(assetDirectory).catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (assetInfo && (!assetInfo.isDirectory() || assetInfo.isSymbolicLink()))
  throw new Error("assets는 심볼릭 링크가 아닌 디렉터리여야 합니다.");
const assets = new Map();
for (const entry of assetInfo
  ? await readdir(assetDirectory, { withFileTypes: true })
  : []) {
  const type = assetTypes.get(path.extname(entry.name).toLowerCase());
  if (!/^[a-z\d][a-z\d._-]*$/i.test(entry.name) || !type) continue;
  if (!entry.isFile())
    throw new Error(`에셋은 일반 파일이어야 합니다: assets/${entry.name}`);
  const buffer = await readFile(path.join(assetDirectory, entry.name));
  assets.set(`assets/${entry.name}`, {
    buffer,
    url: `data:${type};base64,${buffer.toString("base64")}`,
  });
}

// 원본을 유지하고 배포용 복사본과 오프라인 단일 HTML을 만듭니다.
let standalone = source["index.html"];
let stylesheetCount = 0;
standalone = standalone.replace(
  /<link\b[^>]*href=["'](?:\.\/)?style\.css(?:\?[^"']*)?["'][^>]*>/gi,
  () => {
    stylesheetCount++;
    return `<style>\n${source["style.css"].replace(/<\/style/gi, "<\\/style")}\n</style>`;
  },
);
if (stylesheetCount !== 1)
  throw new Error("index.html에서 style.css 참조를 하나 찾아야 합니다.");
for (const filename of files.filter((file) => file.endsWith(".js"))) {
  const escapedName = filename.replace(".", "\\.");
  const reference = new RegExp(
    `<script\\b[^>]*src=["'](?:\\./)?${escapedName}(?:\\?[^"']*)?["'][^>]*>\\s*</script>`,
    "gi",
  );
  let count = 0;
  standalone = standalone.replace(reference, () => {
    count++;
    return `<script>\n${source[filename].replace(/<\/script/gi, "<\\/script")}\n</script>`;
  });
  if (count !== 1)
    throw new Error(`index.html에서 ${filename} 참조를 하나 찾아야 합니다.`);
}
// CSS, JavaScript 문자열, 인라인 SVG의 이미지와 글꼴 경로도 단일 파일 안에 포함합니다.
standalone = standalone.replace(
  /(?:\.\/)?assets\/[a-z\d][a-z\d._-]*\.(?:png|jpe?g|webp|avif|gif|svg|ttf|woff2?|txt)(?:\?[^"'`\s)<>\\#]*)?(?:#[^"'`\s)<>\\]*)?/gi,
  (reference) => {
    const filename = reference.replace(/^\.\//, "").split(/[?#]/)[0];
    const asset = assets.get(filename);
    if (!asset) throw new Error(`참조한 에셋이 없습니다: ${reference}`);
    const fragment = reference.includes("#")
      ? reference.slice(reference.indexOf("#"))
      : "";
    return asset.url + fragment;
  },
);

// 오프라인 배포에도 글꼴 저작권과 라이선스 전문을 읽을 수 있게 보존합니다.
const licenses = [...assets]
  .filter(
    ([filename]) =>
      /(?:^|[-_.])(?:ofl|licen[cs]e)(?:[-_.]|$)/i.test(filename) &&
      filename.endsWith(".txt"),
  )
  .map(
    ([filename, asset]) => `${filename}\n\n${asset.buffer.toString("utf8")}`,
  );
if (licenses.length) {
  const licenseBlock = `<script type="text/plain" id="bundled-font-licenses">\n${licenses.join("\n\n").replace(/<\/script/gi, "<\\/script")}\n</script>`;
  standalone = /<\/body\s*>/i.test(standalone)
    ? standalone.replace(/<\/body\s*>/i, () => `${licenseBlock}\n</body>`)
    : `${standalone}\n${licenseBlock}`;
}

// dist가 다른 디렉터리로 연결된 심볼릭 링크라면 쓰거나 삭제하지 않습니다.
const existing = await lstat(dist).catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existing?.isSymbolicLink())
  throw new Error("dist는 심볼릭 링크가 아닌 디렉터리여야 합니다.");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(
  files.map((filename) =>
    copyFile(path.join(root, filename), path.join(dist, filename)),
  ),
);
if (assets.size) {
  await mkdir(path.join(dist, "assets"));
  await Promise.all(
    [...assets].map(([filename, asset]) =>
      writeFile(path.join(dist, filename), asset.buffer),
    ),
  );
}
await writeFile(path.join(dist, ".nojekyll"), "");
await writeFile(path.join(dist, "standalone.html"), standalone);
console.log(
  "빌드 완료: dist/index.html (정적 배포), dist/standalone.html (단일 파일)",
);
