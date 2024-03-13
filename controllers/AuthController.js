// AuthController.js

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const encodedCredentials = authHeader.slice('Basic '.length);
    const credentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    const hashedPassword = createHash('sha1').update(password).digest('hex');

    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 'EX', 86400);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    redisClient.del(key);

    return res.status(204).end();
  }
}

export default AuthController;
