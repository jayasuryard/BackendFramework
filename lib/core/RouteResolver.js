'use strict';

/**
 * RouteResolver - converts a method folder name into a URL route and back.
 *
 *   user.create        -> /user/create
 *   student.fee.pay    -> /student/fee/pay
 *   invoice.generate   -> /invoice/generate
 *
 * The HTTP verb is taken from init.js (requestMethod). There is intentionally
 * NO manual route registration anywhere in the framework.
 */
const RouteResolver = {
  /** methodName ("user.create") -> route ("/user/create") */
  toRoute(methodName) {
    return '/' + String(methodName).split('.').filter(Boolean).join('/');
  },

  /** route ("/user/create") -> methodName ("user.create") */
  toMethodName(route) {
    return String(route)
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .join('.');
  },

  /** default socket action equals the method name */
  toSocketAction(methodName) {
    return methodName;
  },
};

module.exports = RouteResolver;
