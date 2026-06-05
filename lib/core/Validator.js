'use strict';

const { ValidationError } = require('./errors');

/**
 * Validator - validates & coerces request input against a method's
 * getParameter() contract. Self-contained (no external schema lib required)
 * so the runtime works even before `npm install`.
 *
 * Returns a clean, typed input object. Throws ValidationError on failure.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function coerce(type, value) {
  switch (type) {
    case 'number':
    case 'float': {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'integer': {
      const n = Number(value);
      return Number.isInteger(n) ? n : (Number.isNaN(n) ? value : Math.trunc(n));
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1' || value === 1) return true;
      if (value === 'false' || value === '0' || value === 0) return false;
      return value;
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : value.split(',');
        } catch (_) {
          return value.split(',');
        }
      }
      return value;
    case 'object':
      if (value && typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (_) {
          return value;
        }
      }
      return value;
    default:
      return value;
  }
}

function checkType(type, value, field, errors) {
  switch (type) {
    case 'string':
    case 'email':
    case 'uuid':
    case 'date':
      if (typeof value !== 'string') errors.push(`${field} must be a string`);
      else if (type === 'email' && !EMAIL_RE.test(value)) errors.push(`${field} must be a valid email`);
      else if (type === 'uuid' && !UUID_RE.test(value)) errors.push(`${field} must be a valid uuid`);
      else if (type === 'date' && Number.isNaN(Date.parse(value))) errors.push(`${field} must be a valid date`);
      break;
    case 'number':
    case 'float':
      if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${field} must be a number`);
      break;
    case 'integer':
      if (!Number.isInteger(value)) errors.push(`${field} must be an integer`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${field} must be a boolean`);
      break;
    case 'array':
      if (!Array.isArray(value)) errors.push(`${field} must be an array`);
      break;
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push(`${field} must be an object`);
      break;
    default:
      break;
  }
}

function checkConstraints(rule, value, field, errors) {
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
  }
  if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
    errors.push(`${field} must be >= ${rule.min}`);
  }
  if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
    errors.push(`${field} must be <= ${rule.max}`);
  }
  if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
    errors.push(`${field} must have at least ${rule.minLength} characters`);
  }
  if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
    errors.push(`${field} must have at most ${rule.maxLength} characters`);
  }
  if (rule.pattern && typeof value === 'string' && !new RegExp(rule.pattern).test(value)) {
    errors.push(`${field} does not match required pattern`);
  }
}

const Validator = {
  /**
   * @param {object} schema - output of init.getParameter()
   * @param {object} source - merged { ...query, ...params, ...body, headers }
   * @returns {object} validated, coerced input
   */
  validate(schema, source) {
    const errors = [];
    const out = {};
    if (!schema || typeof schema !== 'object') return out;

    for (const [field, ruleRaw] of Object.entries(schema)) {
      const rule = typeof ruleRaw === 'string' ? { type: ruleRaw } : ruleRaw;
      const type = rule.type || 'string';
      let value = source[field];

      if (value === undefined || value === null || value === '') {
        if (rule.default !== undefined) {
          out[field] = typeof rule.default === 'function' ? rule.default() : rule.default;
          continue;
        }
        if (rule.required) errors.push(`${field} is required`);
        continue;
      }

      value = coerce(type, value);
      checkType(type, value, field, errors);
      checkConstraints(rule, value, field, errors);
      out[field] = value;
    }

    if (errors.length) throw new ValidationError(errors);
    return out;
  },
};

module.exports = Validator;
