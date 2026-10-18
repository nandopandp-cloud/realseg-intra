export const PASSWORD = "Realseg@2026";
export const USERS = {
  carlos: { login: "100231", email: "carlos.silva@demo.realseg.invalid", name: "Carlos" },
  ana: { login: "100198", email: "ana.souza@demo.realseg.invalid", name: "Ana" },
  joao: { login: "100402", email: "joao.pereira@demo.realseg.invalid", name: "João" },
} as const;
export type UserKey = keyof typeof USERS;
export const authFile = (u: UserKey) => `e2e/.auth/${u}.json`;
