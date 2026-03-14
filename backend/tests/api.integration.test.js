import request from 'supertest';

let app;
let db;

async function loginAndGetToken() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  return response.body.data.accessToken;
}

describe('Asterisk Admin API integration', () => {
  beforeAll(async () => {
    const appModule = await import('../src/core/app.js');
    const dbModule = await import('../src/services/db.service.js');
    app = await appModule.createApp();
    db = dbModule.db;
  });

  beforeEach(() => {
    db.exec(`
      DELETE FROM refresh_tokens;
      DELETE FROM callgroups;
      DELETE FROM trunks;
      DELETE FROM endpoints;
      DELETE FROM cdr_records;
      DELETE FROM alerts;
      DELETE FROM activity_logs;
    `);
  });

  test('GET /api/health returns health payload', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('stats');
  });

  test('GET /api/docs returns swagger html', async () => {
    const response = await request(app).get('/api/docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });

  test('auth login + refresh works', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.accessToken).toBeTruthy();
    expect(loginResponse.body.data.refreshToken).toBeTruthy();

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.data.refreshToken });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toBeTruthy();
  });

  test('trunks CRUD + test + status', async () => {
    const token = await loginAndGetToken();
    const create = await request(app)
      .post('/api/trunks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'provider_a',
        host: 'sip.example.com',
        username: 'user1',
        password: 'secret',
        transport: 'udp',
        context: 'from-trunk',
        registerEnabled: true
      });

    expect(create.status).toBe(201);
    const id = create.body.data.trunk.id;

    const list = await request(app).get('/api/trunks').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBe(1);

    const update = await request(app)
      .put(`/api/trunks/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ context: 'from-test' });
    expect(update.status).toBe(200);

    const testResult = await request(app)
      .post(`/api/trunks/${id}/test`)
      .set('Authorization', `Bearer ${token}`);
    expect(testResult.status).toBe(200);

    const status = await request(app)
      .get(`/api/trunks/${id}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);
    expect(status.body.data).toHaveProperty('status');

    const remove = await request(app).delete(`/api/trunks/${id}`).set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
  });

  test('endpoints CRUD + status + csv import + provisioning', async () => {
    const token = await loginAndGetToken();
    const create = await request(app)
      .post('/api/endpoints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        extension: '1001',
        displayName: 'Empfang',
        username: 'empfang',
        password: 'secret123',
        codecs: ['ulaw', 'alaw'],
        template: 'softphone',
        voicemailEnabled: true,
        voicemailBox: '1001'
      });

    expect(create.status).toBe(201);
    const endpointId = create.body.data.endpoint.id;
    const provisioningUrl = create.body.data.endpoint.provisioning_url;
    expect(provisioningUrl).toContain('/provisioning/');

    const details = await request(app)
      .get(`/api/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(details.status).toBe(200);
    expect(details.body.data.extension).toBe('1001');

    const status = await request(app)
      .get(`/api/endpoints/${endpointId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);

    const csvImport = await request(app)
      .post('/api/endpoints/import/csv')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rows: [
          {
            extension: '1002',
            displayName: 'Support',
            username: 'support',
            password: 'secret123',
            codecs: ['ulaw', 'alaw']
          }
        ]
      });
    expect(csvImport.status).toBe(200);
    expect(csvImport.body.data.success).toBe(1);

    const provisioningKey = provisioningUrl.split('/').pop();
    const provisioning = await request(app).get(`/api/provisioning/${provisioningKey}`);
    expect(provisioning.status).toBe(200);
    expect(provisioning.body.data.username).toBe('empfang');

    const update = await request(app)
      .put(`/api/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Empfang Neu' });
    expect(update.status).toBe(200);

    const remove = await request(app)
      .delete(`/api/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
  });

  test('callgroups CRUD works', async () => {
    const token = await loginAndGetToken();
    await request(app)
      .post('/api/endpoints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        extension: '1101',
        displayName: 'Agent 1',
        username: 'agent1',
        password: 'secret123',
        codecs: ['ulaw', 'alaw']
      });

    const create = await request(app)
      .post('/api/callgroups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'sales',
        extension: '2000',
        strategy: 'round-robin',
        timeout: 20,
        members: ['1101']
      });
    expect(create.status).toBe(201);
    const id = create.body.data.callgroup.id;

    const list = await request(app).get('/api/callgroups').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    const update = await request(app)
      .put(`/api/callgroups/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ strategy: 'random' });
    expect(update.status).toBe(200);

    const remove = await request(app)
      .delete(`/api/callgroups/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
  });

  test('server endpoints + dashboard endpoints work', async () => {
    const token = await loginAndGetToken();

    const status = await request(app).get('/api/server/status').set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);
    expect(status.body.data).toHaveProperty('monitoring');

    const reload = await request(app)
      .post('/api/server/reload')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(reload.status).toBe(200);

    const restart = await request(app)
      .post('/api/server/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(restart.status).toBe(200);

    const apiRestart = await request(app)
      .post('/api/server/api-restart')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(apiRestart.status).toBe(200);

    const backups = await request(app).get('/api/server/backups').set('Authorization', `Bearer ${token}`);
    expect(backups.status).toBe(200);
    expect(Array.isArray(backups.body.data)).toBe(true);

    const logs = await request(app)
      .get('/api/server/logs?lines=30&source=asterisk')
      .set('Authorization', `Bearer ${token}`);
    expect(logs.status).toBe(200);

    const activity = await request(app)
      .get('/api/server/activity')
      .set('Authorization', `Bearer ${token}`);
    expect(activity.status).toBe(200);

    const overview = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.data).toHaveProperty('cdr');

    const cdr = await request(app).get('/api/dashboard/cdr').set('Authorization', `Bearer ${token}`);
    expect(cdr.status).toBe(200);

    db.prepare("INSERT INTO alerts (severity, source, key, message, status) VALUES ('warning','test','a1','x','open')").run();
    const alerts = await request(app).get('/api/dashboard/alerts').set('Authorization', `Bearer ${token}`);
    expect(alerts.status).toBe(200);
    const firstAlert = alerts.body.data[0];

    const ack = await request(app)
      .post(`/api/dashboard/alerts/${firstAlert.id}/ack`)
      .set('Authorization', `Bearer ${token}`);
    expect(ack.status).toBe(200);

    const newestBackup = backups.body.data[0];
    if (newestBackup?.name) {
      const rollback = await request(app)
        .post('/api/server/rollback')
        .set('Authorization', `Bearer ${token}`)
        .send({ backupName: newestBackup.name });
      expect(rollback.status).toBe(200);
    }
  });
});
