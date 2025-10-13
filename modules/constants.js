(function(global){
  'use strict';

  const PAGES = Object.freeze([
    'page-mode-select',
    'page-role-select',
    'page-config',
    'page-game',
    'page-tutor-info',
    'page-tutor-config',
    'page-tutor',
    'page-participant',
    'page-report'
  ]);

  const ROUTER = Object.freeze({
    PAGE_IDS: PAGES,
    HIDE_TC_BADGE_PAGES: Object.freeze(['page-mode-select','page-role-select','page-tutor-info','page-tutor-config','page-tutor'])
  });

  const CREDITS = Object.freeze({
    DAILY_LIMIT_DEFAULT: 45,
    PER_EXERCISE_LIMIT_DEFAULT: 30
  });

  global.CONSTANTS = global.CONSTANTS || {};
  global.CONSTANTS.ROUTER = global.CONSTANTS.ROUTER || ROUTER;
  global.CONSTANTS.CREDITS = global.CONSTANTS.CREDITS || CREDITS;
})(typeof window !== 'undefined' ? window : globalThis);
