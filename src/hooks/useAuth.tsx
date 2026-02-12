import { useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const convexUser = useQuery(api.users.getCurrentUser);
  const ensureUser = useMutation(api.users.ensureUser);

  // Auto-create Convex user on first sign-in
  useEffect(() => {
    if (isSignedIn && convexUser === null) {
      ensureUser();
    }
  }, [isSignedIn, convexUser, ensureUser]);

  const isAdmin = convexUser?.role === "admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return {
    user,
    isSignedIn: isLoaded && isSignedIn,
    isLoaded,
    isAdmin,
    convexUser,
    handleSignOut,
  };
};
