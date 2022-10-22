import { NextFunction, Request, Response } from 'express';
import UsersService from '#root/adapters/UsersService';

const injectSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('injecting session');
  if (req.cookies.userSessionId) {
    console.log('');
    const userSession = await UsersService.fetchUserSession({
      sessionId: req.cookies.userSessionId,
    });
    res.locals.userSession = userSession;
    console.log('userSession injected', userSession);
  }

  return next();
};

export default injectSession;
