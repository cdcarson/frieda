import log from './log.js';
export const onUserCancelled = (): never => {
  log.empty();
  log.warn('Operation cancelled');
  log.empty();
  process.exit(0);
};
