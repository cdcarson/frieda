import { select } from '@clack/prompts';
// const fixQusetion = {
//   type: 'list',
//     name: 'fix',
//     message: 'What do you want to do?',
//     choices: [
//       `Enter the database URL directly`,
//       `Enter a different path to an environment variables file`,
//       `I fixed the problem in .env. Read it again`
//     ],
//     default: 0
// }
// const fix = await inquirer.prompt([
//  fixQusetion
// ]);

const foo = select({
  message: 'What do you want to do?',
  options: [
    {
      label: `Enter the database URL directly`,
      value: 'url'
    },
    {
      label: `Enter a path to a different environment variables file`,
      value: 'envFilePath'
    }
  ]
});
console.log(foo);
