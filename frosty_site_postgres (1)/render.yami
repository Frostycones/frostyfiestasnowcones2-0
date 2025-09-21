services:
  - type: web
    name: frostyfiesta
    env: node
    buildCommand: "npm install"
    startCommand: "node server.js"
    plan: free
    envVars:
      - key: SESSION_SECRET
        sync: false
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false
      - key: ADMIN_USER
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
      - key: ADMIN_EMAIL
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_REFRESH_TOKEN
        sync: false
      - key: GOOGLE_CALENDAR_ID
        sync: false
