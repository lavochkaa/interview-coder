const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const { build } = require("../package.json");
const { LATEST_RELEASE_URL, RELEASE_REPOSITORY } = require("../js/release-source");

test("update checks and links use the configured release repository", async () => {
  const publish = build.publish.find((target) => target.provider === "github");
  const repository = `${publish.owner}/${publish.repo}`;
  assert.equal(RELEASE_REPOSITORY, repository);
  assert.equal(LATEST_RELEASE_URL, `https://github.com/${repository}/releases/latest`);
  const requestedUrls = [];
  const notifications = [];
  const originalLoad = Module._load;

  try {
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          app: { getVersion: () => "1.8.1" },
          globalShortcut: { unregisterAll() {} },
        };
      }
      if (request === "axios") {
        return {
          get: async (url) => {
            requestedUrls.push(url);
            return { status: 200, data: { tag_name: "v1.9.0" } };
          },
        };
      }
      if (request === "electron-log") {
        return { info() {}, warn() {}, error() {} };
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    const UpdateManager = require("../js/update-manager");
    const manager = new UpdateManager({
      isDestroyed: () => false,
      webContents: { send: (...args) => notifications.push(args) },
    });

    await manager.checkForUpdates();

    assert.deepEqual(requestedUrls, [`https://api.github.com/repos/${repository}/releases/latest`]);
    assert.equal(manager.getUpdateStatus().downloadUrl, `https://github.com/${repository}/releases/tag/v1.9.0`);
    assert.equal(notifications[0][1].downloadUrl, manager.getUpdateStatus().downloadUrl);
  } finally {
    Module._load = originalLoad;
  }
});

test("major-update fallback opens the configured latest release", () => {
  const originalLoad = Module._load;
  const ipcHandlers = new Map();
  const windowHandlers = new Map();
  const notifications = [];
  const window = {
    webContents: { send: (...args) => notifications.push(args) },
    loadFile() {},
    setContentProtection() {},
    setVisibleOnAllWorkspaces() {},
    setAlwaysOnTop() {},
    on: (name, handler) => windowHandlers.set(name, handler),
    isDestroyed: () => false,
  };

  try {
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          BrowserWindow: class { constructor() { return window; } },
          screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1200, height: 900 } }) },
          app: { getVersion: () => "1.8.1" },
          ipcMain: { on: (name, handler) => ipcHandlers.set(name, handler) },
        };
      }
      if (request === "electron-log") {
        return { info() {}, error() {} };
      }
      if (request === "./config") return { isLinux: false, isMac: true };
      if (request === "./hotkey-manager") return {};
      return originalLoad.call(this, request, parent, isMain);
    };
    const { createMainWindow } = require("../js/window-manager");
    assert.equal(createMainWindow(), window);
    const { IPC_CHANNELS } = require("../js/constants");
    ipcHandlers.get(IPC_CHANNELS.UPDATE_AVAILABLE)(null, { isMajorUpdate: true });
    let prevented = false;
    windowHandlers.get("close")({ preventDefault() { prevented = true; } });

    assert.equal(prevented, true);
    assert.equal(notifications[0][1].downloadUrl, LATEST_RELEASE_URL);
  } finally {
    Module._load = originalLoad;
  }
});
