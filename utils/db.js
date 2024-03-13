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

  async getUserByEmail(email) {
    await this.connect();
    const usersCollection = this.client.db(this.database).collection('users');
    const user = await usersCollection.findOne({ email });
    return user;
  }

  async createUser(user) {
    await this.connect();
    const usersCollection = this.client.db(this.database).collection('users');
    const result = await usersCollection.insertOne(user);
    return result.ops[0];
  }
}

const dbClient = new DBClient();
export default dbClient;
