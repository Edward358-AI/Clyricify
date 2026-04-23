import { getAuthUser } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  return { user };
});
