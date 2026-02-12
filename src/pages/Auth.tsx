import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, useUser } from "@clerk/clerk-react";

const Auth = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      navigate("/");
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
      <SignIn routing="hash" afterSignInUrl="/" />
    </div>
  );
};

export default Auth;
