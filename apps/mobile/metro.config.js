// Bulbu mobile lives in the monorepo but keeps its own node_modules (React 19 here, React 18 in the web app).
// Metro watches the whole repo so it can bundle the shared packages and the web app's 3D engine, and anything those
// shared files import (three, @bulbu/*) is resolved from this app's node_modules.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.resolver.assetExts = [...config.resolver.assetExts, "glb"];

const fromApp = path.join(projectRoot, "package.json");
const shared = name => name === "three" || name.startsWith("three/") || name.startsWith("@bulbu/");
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = shared(moduleName) && !context.originModulePath.startsWith(projectRoot + path.sep)
    ? { ...context, originModulePath: fromApp } : context;
  return upstream ? upstream(ctx, moduleName, platform) : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
