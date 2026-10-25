import { readFile, realpath, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const scripts = [
  "art.js",
  "story.js",
  "simulation.js",
  "game.js",
  "scripts/dev.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/simulation.test.cjs",
];

// 브라우저 코드를 실행하지 않고 JavaScript 구문만 검사합니다.
for (const filename of scripts) {
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, filename)],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const html = await readFile(path.join(root, "index.html"), "utf8");
const css = await readFile(path.join(root, "style.css"), "utf8");
const references = new Set();
for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))
  references.add(match[1]);
for (const match of css.matchAll(
  /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,
)) {
  references.add((match[1] ?? match[2] ?? match[3]).trim());
}
for (const filename of scripts.filter((file) => !file.startsWith("scripts/"))) {
  const source = await readFile(path.join(root, filename), "utf8");
  for (const match of source.matchAll(
    /(?:\.\/)?assets\/[a-z\d][a-z\d._-]*\.(?:png|jpe?g|webp|avif|gif|svg|ttf|woff2?|txt)(?:\?[^"'`\s)<>\\#]*)?(?:#[^"'`\s)<>\\]*)?/gi,
  ))
    references.add(match[0]);
}

let checked = 0;
const rootPath = await realpath(root);
for (const reference of references) {
  // 외부 URL, 인라인 이미지, 같은 페이지 안의 링크는 파일 검사에서 제외합니다.
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(reference))
    continue;
  const relative = decodeURIComponent(reference.split(/[?#]/)[0]).replace(
    /^\//,
    "",
  );
  const filename = path.resolve(root, relative || "index.html");
  if (!filename.startsWith(root))
    throw new Error(`프로젝트 밖의 파일 참조: ${reference}`);
  try {
    const resolved = await realpath(filename);
    const relativePath = path.relative(rootPath, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    )
      throw new Error(`프로젝트 밖의 파일 참조: ${reference}`);
    if (!(await stat(resolved)).isFile())
      throw new Error(`참조가 파일이 아닙니다: ${reference}`);
  } catch {
    throw new Error(
      `참조한 로컬 파일이 없거나 사용할 수 없습니다: ${reference}`,
    );
  }
  checked++;
}
console.log(
  `검사 통과: JavaScript ${scripts.length}개, 로컬 파일 참조 ${checked}개`,
);
