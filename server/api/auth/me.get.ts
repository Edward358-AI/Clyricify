import { getUser } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  return { user };
});
