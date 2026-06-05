'use strict';

/**
 * Global response catalog. Keys are referenced via this.setResponse('KEY').
 * Messages translate automatically based on the Accept-Language header.
 */
const RESPONSE = {
  SUCCESS: {
    responseCode: 200,
    responseMessage: { en: 'Success', hi: 'सफल', kn: 'ಯಶಸ್ವಿ', ar: 'نجاح', es: 'Éxito', fr: 'Succès' },
  },

  USER_CREATED: {
    responseCode: 200,
    responseMessage: {
      en: 'User created successfully',
      hi: 'उपयोगकर्ता सफलतापूर्वक बनाया गया',
      kn: 'ಬಳಕೆದಾರ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ',
      ar: 'تم إنشاء المستخدم بنجاح',
      es: 'Usuario creado correctamente',
      fr: 'Utilisateur créé avec succès',
    },
  },
  USER_UPDATED: {
    responseCode: 200,
    responseMessage: { en: 'User updated successfully', hi: 'उपयोगकर्ता अपडेट किया गया' },
  },
  USER_DELETED: {
    responseCode: 200,
    responseMessage: { en: 'User deleted successfully', hi: 'उपयोगकर्ता हटाया गया' },
  },
  USER_LIST: {
    responseCode: 200,
    responseMessage: { en: 'Users fetched successfully' },
  },
  USER_DETAILS: {
    responseCode: 200,
    responseMessage: { en: 'User details fetched successfully' },
  },
  INVALID_USER: {
    responseCode: 1001,
    responseMessage: { en: 'Invalid user', hi: 'अमान्य उपयोगकर्ता', ar: 'مستخدم غير صالح' },
  },
  USER_NOT_FOUND: {
    responseCode: 1004,
    responseMessage: { en: 'User not found', hi: 'उपयोगकर्ता नहीं मिला' },
  },
  EMAIL_TAKEN: {
    responseCode: 1005,
    responseMessage: { en: 'Email already registered' },
  },

  LOGIN_SUCCESS: {
    responseCode: 200,
    responseMessage: { en: 'Logged in successfully', hi: 'सफलतापूर्वक लॉग इन' },
  },
  LOGOUT_SUCCESS: {
    responseCode: 200,
    responseMessage: { en: 'Logged out successfully' },
  },
  TOKEN_REFRESHED: {
    responseCode: 200,
    responseMessage: { en: 'Token refreshed successfully' },
  },
  INVALID_CREDENTIALS: {
    responseCode: 1002,
    responseMessage: { en: 'Invalid credentials', hi: 'अमान्य प्रमाण-पत्र', ar: 'بيانات اعتماد غير صحيحة' },
  },
  INVALID_TOKEN: {
    responseCode: 401,
    responseMessage: { en: 'Invalid or expired token' },
  },
  INVALID_API_KEY: {
    responseCode: 401,
    responseMessage: { en: 'Invalid API key' },
  },
  METHOD_NOT_ALLOWED: {
    responseCode: 405,
    responseMessage: { en: 'HTTP method not allowed' },
  },

  ROOM_JOINED: {
    responseCode: 200,
    responseMessage: { en: 'Joined room successfully' },
  },
};

module.exports = { RESPONSE };
