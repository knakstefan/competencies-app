import { Link, useLocation } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import cmLogo from "@/assets/cm-logo.png";

interface NavbarProps {
  onSignOut: () => void;
}

const navLinks = [
  { to: "/", label: "Home", match: (p: string) => p === "/" || p.startsWith("/roles") },
  { to: "/levels", label: "Levels", match: (p: string) => p === "/levels" },
  { to: "/pipeline", label: "Hiring Stages", match: (p: string) => p === "/pipeline" },
  { to: "/users", label: "Members", match: (p: string) => p === "/users" },
];

export const Navbar = ({ onSignOut }: NavbarProps) => {
  const location = useLocation();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center shrink-0">
            <img src={cmLogo} alt="CM Logo" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                size="sm"
                asChild
                className={link.match(location.pathname) ? "text-foreground" : "text-muted-foreground"}
              >
                <Link to={link.to}>{link.label}</Link>
              </Button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onSignOut} className="flex items-center gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
