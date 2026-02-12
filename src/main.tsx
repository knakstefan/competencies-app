import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
