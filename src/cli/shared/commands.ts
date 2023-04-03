import type {CommandId, Command} from './types.js'

export const commands: Command[] = [
  {
    id: 'migrate',
    description: 'Run the current migration.'
  },
  {
    id: 'introspect',
    description: 'Create an introspection.sql file containing the current database schema.'
  },
  {
    id: 'generate',
    description: 'Generate javascript models and other code from the current database schema.'
  },
  {
    id: 'help',
    description: 'Show this help.'
  }
];