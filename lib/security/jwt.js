'use strict';

/**
 * jwt - thin wrapper around jsonwebtoken with a safe fallback (HMAC-SHA256)
 * so token signing/verification works even before dependencies are installed.
 */
const crypto = require('crypto');

let jwtLib = null;
try {
  // eslint-disable-next-line global-require
  jwtLib = require('jsonwebtoken');
} catch (_) {
  jwtLib = null;
}

const SECRET = () => process.env.JWT_SECRET || 'rrf-dev-secret-change-me';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString();
}

const fallback = {
  sign(payload, expiresInSec = 3600) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(
      JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSec })
    );
    const sig = crypto.createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${header}.${body}.${sig}`;
  },
  verify(token) {
    const [header, body, sig] = String(token).split('.');
    if (!header || !body || !sig) throw new Error('malformed token');
    const expected = crypto.createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new Error('invalid signature');
    }
    const payload = JSON.parse(fromBase64url(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('token expired');
    return payload;
  },
};

module.exports = {
  sign(payload, opts = {}) {
    const expiresIn = opts.expiresIn || process.env.JWT_EXPIRES || '1h';
    if (jwtLib) return jwtLib.sign(payload, SECRET(), { expiresIn });
    const sec = typeof expiresIn === 'number' ? expiresIn : parseDuration(expiresIn);
    return fallback.sign(payload, sec);
  },
  verify(token) {
    if (jwtLib) return jwtLib.verify(token, SECRET());
    return fallback.verify(token);
  },
};

function parseDuration(str) {
  const m = String(str).match(/^(\d+)([smhd])?$/);
  if (!m) return 3600;
  const n = Number(m[1]);
  const unit = m[2] || 's';
  return { s: 1, m: 60, h: 3600, d: 86400 }[unit] * n;
}
