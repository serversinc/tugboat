import chalk from "chalk";

export function info(prefix: string, message: string) {
  console.log(chalk.blueBright(`[ ${prefix} ]`), message);
}

export function warn(prefix: string, message: string) {
  console.warn(chalk.yellow(`[ ${prefix} ]`), message);
}

export function error(prefix: string, message: string) {
  console.error(chalk.red(`[ ${prefix} ]`), message);
}

export function success(prefix: string, message: string) {
  console.log(chalk.green(`[ ${prefix} ]`), message);
}
