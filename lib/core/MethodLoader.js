'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('./Registry');
const RouteResolver = require('./RouteResolver');
const logger = require('./logger');

/**
 * MethodLoader - convention-based discovery of all Methods, Libraries,
 * Tasks, Responses, Config and i18n strings. Run once at boot.
 *
 * A Method is any folder under src/methods that contains an init.js + action.js.
 * The folder name (e.g. user.create) defines the route and method name.
 */
const Loaders = {
  /** Discover and register everything. Returns the populated registry. */
  bootstrap(appRoot = process.cwd()) {
    if (registry.booted) return registry;
    const src = path.join(appRoot, 'src');

    this.loadConfig(src);
    this.loadResponses(src);
    this.loadStrings(src);
    this.loadLibraries(src);
    this.loadMethods(src);
    this.loadTasks(src);

    registry.booted = true;
    logger.info('RRF registry booted', {
      methods: registry.methods.size,
      libraries: registry.libraries.size,
      tasks: registry.tasks.size,
      sockets: registry.socketActions.size,
    });
    return registry;
  },

  loadConfig(src) {
    const configPath = path.join(src, 'config', 'config.json');
    const routePath = path.join(src, 'config', 'route.json');
    registry.config = readJson(configPath, {});
    registry.routeConfig = readJson(routePath, {});
  },

  loadResponses(src) {
    const file = path.join(src, 'global', 'responses.js');
    if (fs.existsSync(file)) {
      const mod = safeRequire(file);
      registry.responses = mod?.RESPONSE || mod?.default || mod || {};
    }
    // Always ensure framework-level baseline keys exist.
    registry.responses = { ...baselineResponses(), ...registry.responses };
  },

  loadStrings(src) {
    const dir = path.join(src, 'global', 'i18n', 'strings');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const m = file.match(/^string\.([a-z]{2})\.js$/i);
      if (!m) continue;
      const lang = m[1].toLowerCase();
      const mod = safeRequire(path.join(dir, file));
      registry.strings[lang] = mod?.STRINGS || mod?.default || mod || {};
    }
  },

  loadLibraries(src) {
    const dir = path.join(src, 'library');
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const libDir = path.join(dir, entry);
      if (!fs.statSync(libDir).isDirectory()) continue;
      const indexFile = path.join(libDir, 'index.js');
      const file = fs.existsSync(indexFile)
        ? indexFile
        : firstJsFile(libDir);
      if (!file) continue;
      const mod = safeRequire(file);
      const instance = mod?.default || mod;
      // name: helperlib -> helper, sqllib -> sql, userlib -> user
      const name = entry.replace(/lib$/i, '');
      registry.registerLibrary(name, instance);
      registry.registerLibrary(entry, instance); // also under full folder name
    }
  },

  loadMethods(src) {
    const dir = path.join(src, 'methods');
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const methodDir = path.join(dir, entry);
      if (!fs.statSync(methodDir).isDirectory()) continue;
      const initFile = path.join(methodDir, 'init.js');
      const actionFile = path.join(methodDir, 'action.js');
      if (!fs.existsSync(initFile) || !fs.existsSync(actionFile)) continue;

      const InitClass = resolveClass(safeRequire(initFile));
      const ActionClass = resolveClass(safeRequire(actionFile));
      if (!InitClass || !ActionClass) {
        logger.warn(`Skipping method ${entry}: missing init/action class`);
        continue;
      }

      const initInstance = new InitClass();
      const meta = initInstance.initializer || {};
      const descriptor = {
        name: entry,
        dir: methodDir,
        route: RouteResolver.toRoute(entry),
        requestMethods: (meta.requestMethod || ['POST']).map((m) => m.toUpperCase()),
        socketAction: meta.socketAction || RouteResolver.toSocketAction(entry),
        meta,
        InitClass,
        ActionClass,
        getParameter: () => initInstance.getParameter(),
        getResponses: () => initInstance.getResponses(),
        examples: readJson(path.join(methodDir, 'examples.json'), {}),
      };
      registry.registerMethod(descriptor);
    }
  },

  loadTasks(src) {
    const dir = path.join(src, 'tasks');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.task.js')) continue;
      const mod = safeRequire(path.join(dir, file));
      const def = mod?.default || mod;
      if (!def || !def.schedule || typeof def.handler !== 'function') {
        logger.warn(`Skipping task ${file}: must export { name, schedule, handler }`);
        continue;
      }
      registry.registerTask({
        name: def.name || file.replace(/\.task\.js$/, ''),
        schedule: def.schedule,
        handler: def.handler,
        retries: def.retries || 0,
        timezone: def.timezone,
        file,
      });
    }
  },
};

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    logger.warn(`Failed reading JSON ${file}: ${e.message}`);
    return fallback;
  }
}

function safeRequire(file) {
  try {
    return require(file);
  } catch (e) {
    logger.error(`Failed loading ${file}: ${e.message}`);
    return null;
  }
}

function resolveClass(mod) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (mod.default && typeof mod.default === 'function') return mod.default;
  // pick first exported function (class)
  const fn = Object.values(mod).find((v) => typeof v === 'function');
  return fn || null;
}

function firstJsFile(dir) {
  const f = fs.readdirSync(dir).find((x) => x.endsWith('.js'));
  return f ? path.join(dir, f) : null;
}

function baselineResponses() {
  return {
    SUCCESS: { responseCode: 200, responseMessage: { en: 'Success' } },
    UNKNOWN: { responseCode: 520, responseMessage: { en: 'Unknown response' } },
    VALIDATION_FAILED: { responseCode: 422, responseMessage: { en: 'Validation failed' } },
    UNAUTHORIZED: { responseCode: 401, responseMessage: { en: 'Unauthorized' } },
    FORBIDDEN: { responseCode: 403, responseMessage: { en: 'Forbidden' } },
    ROUTE_NOT_FOUND: { responseCode: 404, responseMessage: { en: 'Route not found' } },
    RATE_LIMIT_EXCEEDED: { responseCode: 429, responseMessage: { en: 'Too many requests' } },
    INTERNAL_ERROR: { responseCode: 500, responseMessage: { en: 'Internal server error' } },
  };
}

module.exports = Loaders;
