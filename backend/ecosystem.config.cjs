const path = require('path');

module.exports = {
  apps: [
    {
      name: 'asterisk-admin-api',
      script: path.join(__dirname, 'src/index.js'),
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
