import { createServerFn } from "@tanstack/react-start";

export const getEmailConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  return {
    connected: !!(apiKey && from),
    from: from ?? null,
  };
});
