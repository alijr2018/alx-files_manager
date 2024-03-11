// eslint-disable-next-line no-unused-vars
// controllers/AppController.js
import dbClient from '../utils/db';

class AppController {

  static getStatus(req, res) {
    const status = {
      redis: dbClient.isAlive(),
      db: dbClient.isAlive(),
    };

    res.status(200).json(status);
  }

  static async getStats(req, res) {
    try {
      const numUsers = await dbClient.nbUsers();
      const numFiles = await dbClient.nbFiles();

      const stats = {
        users: numUsers,
        files: numFiles,
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
}

export default AppController;
