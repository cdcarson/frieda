import log from './log.js';
export const onUserCancelled = (): never => {
  log.empty();
  log.warn('Process cancelled');
  log.empty();
  process.exit(0);
};
