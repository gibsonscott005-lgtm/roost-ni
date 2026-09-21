import { createServerFn } from "@tanstack/react-start";

/**
 * Reports whether managed email sending is wired up for this project.
 * Sending runs through Lovable's managed email service on the verified
 * sender domain — no third-party API key is involved.
 */
export const getEmailConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  const configured = !!process.env["LOVABLE_API_KEY"];
  return {
    connected: configured,
    from: configured ? "RoostNI <noreply@notify.roostni.co.uk>" : null,
  };
});
