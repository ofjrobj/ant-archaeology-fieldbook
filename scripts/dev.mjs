import http from "node:http";
import { watch } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const rootPath = await realpath(root);
const files = new Map([
  ["index.html", "text/html; charset=utf-8"],
  ["style.css", "text/css; charset=utf-8"],
  ["art.js", "text/javascript; charset=utf-8"],
  ["story.js", "text/javascript; charset=utf-8"],
  ["simulation.js", "text/javascript; charset=utf-8"],
  ["game.js", "text/javascript; charset=utf-8"],
]);
const imageTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
]);
const assetDirectory = path.join(rootPath, "assets");
function assetType(filename) {
  if (!/^assets\/[a-z\d][a-z\d._-]*$/i.test(filename)) return undefined;
  return imageTypes.get(path.extname(filename).toLowerCase());
}

let portValue = process.env.PORT ?? "4173";
for (let i = 2; i < process.argv.length; i++) {
  const argument = process.argv[i];
  if (argument === "--port") portValue = process.argv[++i];
  else if (argument.startsWith("--port=")) portValue = argument.slice(7);
  else
    throw new Error(
      `알 수 없는 옵션: ${argument}. 사용법: npm run dev -- --port 4173`,
    );
}
const port = Number(portValue);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    "PORT 또는 --port에는 1~65535 사이의 포트 번호를 입력하세요.",
  );
}

// 이 스크립트는 개발 서버의 HTML 응답에만 추가됩니다. 로컬 저장소는 지우지 않습니다.
const reloadScript = `<script>
(() => {
  const updates = new EventSource('/__live_reload');
  updates.addEventListener('reload', () => location.reload());
})();
</script>`;
const clients = new Set();

const server = http.createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (pathname === "/__live_reload") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.write("retry: 1000\n\n");
    clients.add(response);
    response.on("close", () => clients.delete(response));
    return;
  }

  // 서비스할 파일을 명시적으로 제한하여 .git, 숨김 파일, 상위 경로를 노출하지 않습니다.
  const filename = pathname === "/" ? "index.html" : pathname.slice(1);
  const imageType = assetType(filename);
  const contentType = files.get(filename) ?? imageType;
  if (!contentType) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  try {
    const filepath = await realpath(path.join(root, filename));
    if (path.dirname(filepath) !== (imageType ? assetDirectory : rootPath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    let content = await readFile(filepath, imageType ? undefined : "utf8");
    if (filename === "index.html") {
      content = /<\/body\s*>/i.test(content)
        ? content.replace(/<\/body\s*>/i, () => `${reloadScript}\n</body>`)
        : `${content}\n${reloadScript}`;
    }
    response.writeHead(200, { "Content-Type": contentType });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500);
    response.end(error.code === "ENOENT" ? "Not found" : "Unable to read file");
  }
});

// 폴더를 감시하면 편집기가 파일을 교체하여 저장해도 계속 변경을 감지합니다.
let reloadTimer;
function reload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of clients)
      client.write("event: reload\ndata: changed\n\n");
    console.log("파일 변경 감지 → 미리보기 새로고침");
  }, 150);
}
let assetWatcher;
let closing = false;
async function watchAssets() {
  if (assetWatcher || closing) return;
  const directory = await lstat(assetDirectory).catch(() => null);
  if (
    !directory?.isDirectory() ||
    directory.isSymbolicLink() ||
    closing ||
    assetWatcher
  )
    return;
  try {
    assetWatcher = watch(assetDirectory, (_event, filename) => {
      if (!filename || assetType(`assets/${filename}`)) reload();
    });
    assetWatcher.on("error", () => {
      assetWatcher?.close();
      assetWatcher = undefined;
    });
  } catch {
    // 폴더를 교체하는 저장 작업은 다음 루트 변경 이벤트에서 다시 감시합니다.
  }
}
const watcher = watch(root, (_event, filename) => {
  const name = filename?.toString();
  if (name === "assets") {
    assetWatcher?.close();
    assetWatcher = undefined;
    void watchAssets();
    reload();
  } else if (files.has(name)) reload();
});
await watchAssets();
const heartbeat = setInterval(() => {
  for (const client of clients) client.write(": keep-alive\n\n");
}, 15000);

server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `포트 ${port}가 사용 중입니다. npm run dev -- --port ${port + 1}로 실행하세요.`
      : error.message,
  );
  watcher.close();
  closing = true;
  assetWatcher?.close();
  clearInterval(heartbeat);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Out of line: http://localhost:${port}`);
  console.log(
    "원본 파일을 저장하면 미리보기가 자동으로 새로고침됩니다. 종료: Ctrl+C",
  );
});

function stop() {
  closing = true;
  watcher.close();
  assetWatcher?.close();
  clearInterval(heartbeat);
  clearTimeout(reloadTimer);
  for (const client of clients) client.end();
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
