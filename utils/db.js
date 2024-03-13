// utils/db.js

import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${this.host}:${this.port}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.connectPromise = new Promise((resolve, reject) => {
      this.client.connect((err) => {
        if (err) {
          console.error(`DB Connection Error: ${err}`);
          reject(err);
        } else {
          console.log('DB Connected');
          resolve();
        }
      });
    });
  }

  async connect() {
    await this.connectPromise;
  }

  isAlive() {
    return !!this.client && this.client.isConnected();
  }

  async nbUsers() {
    await this.connect();
    const usersCollection = this.client.db(this.database).collection('users');
    const userCount = await usersCollection.countDocuments();
    return userCount;
  }

  async nbFiles() {
    await this.connect();
    const filesCollection = this.client.db(this.database).collection('files');
    const filesCount = await filesCollection.countDocuments();
    return filesCount;
  }
}

const dbClient = new DBClient();
export default dbClient;
