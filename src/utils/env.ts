// Checks all environment variables are set

export function checkEnv() {
  let requiredEnv = ["TUGBOAT_PORT"];
  let optionalEnv = ["TUGBOAT_PHONE_HOME_INTERVAL", "TUGBOAT_PHONE_HOME_URL"];

  for (const env of requiredEnv) {
    if (!process.env[env]) {
      throw new Error(`${env} environment variable is required`);
    }
  }

  for (const env of optionalEnv) {
    if (!process.env[env]) {
      console.log(`${env} environment variable is not set. This instance will not phone home.`);
    }
  }
}
