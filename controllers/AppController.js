// AppController.js

import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    const redisIsAlive = redisClient.isAlive();
    const dbIsAlive = dbClient.isAlive();

    res.status(200).json({ redis: redisIsAlive, db: dbIsAlive });
  }

  static async getStats(req, res) {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();

    res.status(200).json({ users: numUsers, files: numFiles });
  }
}

export default AppController;
