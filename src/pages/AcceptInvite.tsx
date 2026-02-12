import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSignUp } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const AcceptInvite = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { signUp, setActive } = useSignUp();

  const ticket = searchParams.get("__clerk_ticket");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid password",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return;
    }

    if (!signUp || !ticket) {
      toast({
        title: "Invalid invitation",
        description: "Please use the invitation link from your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.create({
        strategy: "ticket",
        ticket,
        password,
      });

      if (result.status === "complete" && setActive) {
        await setActive({ session: result.createdSessionId });
        toast({
          title: "Account created successfully",
          description: "You can now access the application.",
        });
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error creating account",
        description: error.errors?.[0]?.message || error.message || "Failed to create your account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Set your password to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
