import { config } from '../core/config.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Asterisk Admin API',
    version: '0.2.0',
    description: 'REST API fuer Trunks, Endpoints, Callgroups, Monitoring und Server-Steuerung.'
  },
  servers: [{ url: `http://localhost:${config.port}` }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Systemstatus abrufen',
        security: [],
        responses: {
          '200': {
            description: 'Health payload'
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login und JWT erhalten',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Token pair' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Access token erneuern',
        security: [],
        responses: { '200': { description: 'Token refreshed' } }
      }
    },
    '/api/trunks': {
      get: { tags: ['Trunks'], summary: 'Alle Trunks laden', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Trunks'], summary: 'Trunk erstellen', responses: { '201': { description: 'Created' } } }
    },
    '/api/trunks/{id}': {
      put: { tags: ['Trunks'], summary: 'Trunk aktualisieren', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Trunks'], summary: 'Trunk loeschen', responses: { '200': { description: 'Deleted' } } }
    },
    '/api/trunks/{id}/test': {
      post: { tags: ['Trunks'], summary: 'Trunk-Test starten', responses: { '200': { description: 'Test done' } } }
    },
    '/api/trunks/{id}/status': {
      get: { tags: ['Trunks'], summary: 'Trunk-Live-Status', responses: { '200': { description: 'Status' } } }
    },
    '/api/endpoints': {
      get: { tags: ['Endpoints'], summary: 'Alle Endpoints laden', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Endpoints'], summary: 'Endpoint erstellen', responses: { '201': { description: 'Created' } } }
    },
    '/api/endpoints/{id}': {
      get: { tags: ['Endpoints'], summary: 'Endpoint-Details', responses: { '200': { description: 'OK' } } },
      put: { tags: ['Endpoints'], summary: 'Endpoint aktualisieren', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Endpoints'], summary: 'Endpoint loeschen', responses: { '200': { description: 'Deleted' } } }
    },
    '/api/endpoints/{id}/status': {
      get: { tags: ['Endpoints'], summary: 'Endpoint-Live-Status', responses: { '200': { description: 'Status' } } }
    },
    '/api/endpoints/import/csv': {
      post: { tags: ['Endpoints'], summary: 'CSV Import fuer Endpoints', responses: { '200': { description: 'Import result' } } }
    },
    '/api/provisioning/{key}': {
      get: {
        tags: ['Provisioning'],
        summary: 'Provisioning Payload abrufen',
        security: [],
        responses: { '200': { description: 'Provisioning data' } }
      }
    },
    '/api/callgroups': {
      get: { tags: ['Callgroups'], summary: 'Alle Callgroups laden', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Callgroups'], summary: 'Callgroup erstellen', responses: { '201': { description: 'Created' } } }
    },
    '/api/callgroups/{id}': {
      put: { tags: ['Callgroups'], summary: 'Callgroup aktualisieren', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Callgroups'], summary: 'Callgroup loeschen', responses: { '200': { description: 'Deleted' } } }
    },
    '/api/server/status': {
      get: { tags: ['Server'], summary: 'Serverstatus inkl. Monitoring', responses: { '200': { description: 'OK' } } }
    },
    '/api/server/reload': {
      post: { tags: ['Server'], summary: 'Sanfter Reload', responses: { '200': { description: 'Reloaded' } } }
    },
    '/api/server/restart': {
      post: { tags: ['Server'], summary: 'Asterisk Neustart', responses: { '200': { description: 'Restart initiated' } } }
    },
    '/api/server/api-restart': {
      post: { tags: ['Server'], summary: 'API Prozess neu starten', responses: { '200': { description: 'Queued' } } }
    },
    '/api/server/backups': {
      get: { tags: ['Server'], summary: 'Backups auflisten', responses: { '200': { description: 'OK' } } }
    },
    '/api/server/rollback': {
      post: { tags: ['Server'], summary: 'Backup einspielen', responses: { '200': { description: 'Rolled back' } } }
    },
    '/api/server/logs': {
      get: { tags: ['Server'], summary: 'Logzeilen laden', responses: { '200': { description: 'OK' } } }
    },
    '/api/server/activity': {
      get: { tags: ['Server'], summary: 'Aktivitaetslog', responses: { '200': { description: 'OK' } } }
    },
    '/api/dashboard/overview': {
      get: { tags: ['Dashboard'], summary: 'Dashboard Gesamüberblick', responses: { '200': { description: 'OK' } } }
    },
    '/api/dashboard/cdr': {
      get: { tags: ['Dashboard'], summary: 'CDR Statistik', responses: { '200': { description: 'OK' } } }
    },
    '/api/dashboard/alerts': {
      get: { tags: ['Dashboard'], summary: 'Alerts abrufen', responses: { '200': { description: 'OK' } } }
    },
    '/api/dashboard/alerts/{id}/ack': {
      post: { tags: ['Dashboard'], summary: 'Alert bestaetigen', responses: { '200': { description: 'Acknowledged' } } }
    }
  }
};
