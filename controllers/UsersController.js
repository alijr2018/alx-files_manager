// eslint-disable-next-line no-unused-vars
// controllers/UsersController.js

import dbClient from '../utils/db';
import sha1 from 'sha1';

class UsersController {
    /**
   *
   * To create a user, you must specify an email and a password
   * If the email is missing, return an error Missing email with a status code 400
   * If the password is missing, return an error Missing password with a status code 400
   * If the email already exists in DB, return an error Already exist with a status code 400
   * The password must be stored after being hashed in SHA1
   * The endpoint is returning the new user with only the email and the id
   * (auto generated by MongoDB) with a status code 201
   * The new user must be saved in the collection users:
   * email: same as the value received
   * password: SHA1 value of the value received
   * */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await dbClient.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);

    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      const insertedUser = await dbClient.createUser(newUser);

      res.status(201).json({ id: insertedUser._id, email: insertedUser.email });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
}

export default UsersController;
