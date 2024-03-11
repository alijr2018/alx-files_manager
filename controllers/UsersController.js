// eslint-disable-next-line no-unused-vars
// UsersController.js

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

    const existingUser = await dbClient.users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      const result = await dbClient.users.insertOne(newUser);
      const { _id, ...createdUser } = result.ops[0];
      return res.status(201).json({ id: _id, email: createdUser.email });
    } catch (err) {
      console.error(`Error creating user: ${err}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UsersController;
