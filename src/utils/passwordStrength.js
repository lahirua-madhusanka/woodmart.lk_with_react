const PASSWORD_RULES = {
  minLength: {
    key: "minLength",
    label: "At least 8 characters",
    test: (value) => String(value || "").length >= 8,
  },
  uppercase: {
    key: "uppercase",
    label: "At least one uppercase letter",
    test: (value) => /[A-Z]/.test(String(value || "")),
  },
  lowercase: {
    key: "lowercase",
    label: "At least one lowercase letter",
    test: (value) => /[a-z]/.test(String(value || "")),
  },
  number: {
    key: "number",
    label: "At least one number",
    test: (value) => /\d/.test(String(value || "")),
  },
  special: {
    key: "special",
    label: "At least one special character",
    test: (value) => /[^A-Za-z0-9]/.test(String(value || "")),
  },
};

const RULE_LIST = Object.values(PASSWORD_RULES);

export const evaluatePasswordStrength = (value) => {
  const password = String(value || "");
  const rules = RULE_LIST.map((rule) => ({
    key: rule.key,
    label: rule.label,
    passed: rule.test(password),
  }));

  const passedCount = rules.filter((rule) => rule.passed).length;
  const isStrong = passedCount === rules.length;

  let level = "weak";
  if (passedCount >= 4) {
    level = "strong";
  } else if (passedCount >= 2) {
    level = "medium";
  }

  return {
    level,
    score: passedCount,
    maxScore: rules.length,
    isStrong,
    rules,
  };
};
