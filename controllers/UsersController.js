// eslint-disable-next-line no-unused-vars
// UsersController.js
// controllers/UsersController.js

import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);

    const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });

    const newUser = {
      id: result.insertedId,
      email,
    };

    return res.status(201).json(newUser);
  }
}

export default UsersController;
