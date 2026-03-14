import { db } from '../../services/db.service.js';
import { config } from '../../core/config.js';

export function byKey(req, res, next) {
  try {
    const key = String(req.params.key || '').trim();
    const endpoint = db
      .prepare(
        `
        SELECT extension, username, password, context, codecs, voicemail_enabled, voicemail_box
        FROM endpoints
        WHERE provisioning_key = ? OR extension = ?
      `
      )
      .get(key, key);

    if (!endpoint) {
      res.status(404).json({ success: false, message: 'Provisioning key not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Provisioning payload',
      data: {
        server: config.asterisk.host,
        extension: endpoint.extension,
        username: endpoint.username,
        password: endpoint.password,
        context: endpoint.context,
        codecs: endpoint.codecs,
        voicemailEnabled: Boolean(endpoint.voicemail_enabled),
        voicemailBox: endpoint.voicemail_box || endpoint.extension
      }
    });
  } catch (err) {
    next(err);
  }
}
