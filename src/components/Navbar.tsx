import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, Users, ChevronDown, Layers, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import cmLogo from "@/assets/cm-logo.png";

interface NavbarProps {
  onSignOut: () => void;
}

const navLinks = [
  { to: "/", label: "Home", match: (p: string) => p === "/" || p.startsWith("/roles") },
];

const adminLinks = [
  { to: "/levels", label: "Levels", icon: Layers },
  { to: "/pipeline", label: "Hiring Stages", icon: GitBranch },
];

export const Navbar = ({ onSignOut }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const isAdminRoute = location.pathname === "/levels" || location.pathname === "/pipeline";

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

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1 ${isAdminRoute ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Hiring
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  {adminLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.to}
                      onClick={() => navigate(link.to)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary/10">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/users")} className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
