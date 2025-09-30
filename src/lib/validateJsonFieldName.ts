const maxLength = 64;

export const VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE = `It must contain between 1 and ${maxLength} characters, start with a letter or underscore (_), cannot start with two underscores (__), and can only include letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_).`;

const validPattern = /^(?!__)[a-zA-Z_][a-zA-Z0-9-_]*$/;

export const validateJsonFieldName = (id: string) => {
  const isInvalid =
    id.length < 1 || id.length > maxLength || !validPattern.test(id);

  return !isInvalid;
};
