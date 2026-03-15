export function getPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

export function isPrismaSchemaNotReadyError(error: unknown) {
  const code = getPrismaErrorCode(error);
  return code === "P2021" || code === "P2022";
}
