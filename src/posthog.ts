import posthog from 'posthog-js'

posthog.init('phc_WOHgnCZE8cPXfL1zyJItWyQOQo7W1VEEXrRrEV7YSHK', {
  api_host: 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: false, // set to true if you wanna mask inputs
  },
})

export default posthog;
