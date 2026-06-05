'use strict';

/**
 * Registry - the single source of truth for everything the framework discovers.
 *
 * Holds Methods, Libraries, Tasks, Sockets, Config, Responses and i18n strings.
 * Populated once at boot by the various loaders and then read by every runtime.
 */
class Registry {
  constructor() {
    this.methods = new Map(); // methodName -> MethodDescriptor
    this.routes = new Map(); // "METHOD /path" -> methodName
    this.socketActions = new Map(); // action -> methodName
    this.libraries = new Map(); // libName -> instance
    this.tasks = new Map(); // taskName -> taskDescriptor
    this.responses = {}; // key -> { responseCode, responseMessage }
    this.strings = {}; // lang -> { key: value }
    this.config = {}; // merged config.json
    this.routeConfig = {}; // route.json overrides
    this.booted = false;
  }

  registerMethod(descriptor) {
    this.methods.set(descriptor.name, descriptor);
    for (const httpMethod of descriptor.requestMethods) {
      this.routes.set(`${httpMethod.toUpperCase()} ${descriptor.route}`, descriptor.name);
    }
    if (descriptor.socketAction) {
      this.socketActions.set(descriptor.socketAction, descriptor.name);
    }
  }

  getMethod(name) {
    return this.methods.get(name);
  }

  resolveRoute(httpMethod, route) {
    return this.routes.get(`${httpMethod.toUpperCase()} ${route}`);
  }

  registerLibrary(name, instance) {
    this.libraries.set(name.toLowerCase(), instance);
  }

  getLibrary(name) {
    return this.libraries.get(String(name).toLowerCase());
  }

  registerTask(descriptor) {
    this.tasks.set(descriptor.name, descriptor);
  }

  listMethods() {
    return [...this.methods.values()];
  }

  listTasks() {
    return [...this.tasks.values()];
  }
}

// Singleton — one registry per process.
module.exports = new Registry();
