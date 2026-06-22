import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roost NI — Sign in or sign up" },
      {
        name: "description",
        content:
          "Create a verified Tenant or Landlord account on Roost NI. Email sign-up for renters and property owners in Northern Ireland.",
      },
    ],
  }),
  component: () => <Navigate to="/auth" />,
});

