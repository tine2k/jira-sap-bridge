export function redactBody(body: string, secrets: readonly string[]): string {
  let result = body;
  for (const secret of secrets) {
    if (secret.length > 0) {
      result = result.split(secret).join("***");
    }
  }
  return result;
}
