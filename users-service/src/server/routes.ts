import { Express } from 'express';
import { getConnection, getRepository } from 'typeorm';
import dayjs from 'dayjs';
import config from 'config';
import omit from 'lodash.omit';

import User from '#root/db/entities/User';
import UserSession from '#root/db/entities/UserSession';
import generateUUID from '#root/helpers/generateUUID';
import passwordCompareSync from '#root/helpers/passwordCompareSync';
import hashPassword from '#root/helpers/hashPassword';

export const USER_SESSION_EXPIRY_HOURS = <number>(
  config.get('USER_SESSION_EXPIRY_HOURS')
);

const setupRoutes = (app: Express) => {
  const connection = getConnection();
  const userRepository = getRepository(User);
  const userSessionRepository = getRepository(UserSession);

  app.post('/sessions', async (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return next(new Error('Invalid body'));
    }

    try {
      const user = await userRepository.findOne(
        { username: req.body.username },
        { select: ['id', 'passwordHash'] }
      );

      if (!user) return next(new Error('Invalid username'));

      if (!passwordCompareSync(req.body.password, user.passwordHash)) {
        return next(new Error('invalid password'));
      }

      const expiresAt = dayjs()
        .add(USER_SESSION_EXPIRY_HOURS, 'hour')
        .toISOString();
      const sessionToken = generateUUID();

      const userSession = {
        expiresAt,
        id: sessionToken,
        userId: user.id,
      };

      console.log('userSession', userSession);

      await connection
        .createQueryBuilder()
        .insert()
        .into(UserSession)
        .values([userSession])
        .execute();

      return res.json(userSession);
    } catch (err) {
      return next(err);
    }
  });

  app.delete('/sessions/:sessionId', async (req, res, next) => {
    try {
      const userSession = await userSessionRepository.findOne(
        req.params.sessionId
      );

      if (!userSession) return next(new Error('Invalid Session Id'));

      await userSessionRepository.remove(userSession);

      return res.end();
    } catch (err) {
      return next(err);
    }
  });

  app.get('/sessions/:sessionId', async (req, res, next) => {
    try {
      const userSession = await userSessionRepository.findOne(
        req.params.sessionId
      );

      if (!userSession) return next(new Error('Invalid Session Id'));

      await userSessionRepository.remove(userSession);

      return res.json(userSession);
    } catch (err) {
      return next(err);
    }
  });

  app.post('/users', async (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return next(new Error('Invalid Body'));
    }

    try {
      const newUser = {
        id: generateUUID(),
        passwordHash: hashPassword(req.body.password),
        username: req.body.username,
      };

      await connection
        .createQueryBuilder()
        .insert()
        .into(User)
        .values([newUser])
        .execute();

      return res.json(omit(newUser, ['passwordHash']));
    } catch (err) {
      return next(err);
    }
  });

  app.get('/users/:userId', async (req, res, next) => {
    try {
      const user = await userRepository.findOne(req.params.userId);

      if (!user) return next(new Error('Invalid user ID'));

      return res.json(user);
    } catch (err) {
      return next(err);
    }
  });
};

export default setupRoutes;
