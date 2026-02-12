import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SlidersVertical, Users, UserCog, LogOut, ChartNetwork, Menu, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import cmLogo from "@/assets/cm-logo.png";

interface NavbarProps {
  onSignOut: () => void;
}

export const Navbar = ({ onSignOut }: NavbarProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/manage", label: "Competencies", icon: ChartNetwork },
    { path: "/", label: "Levels", icon: SlidersVertical },
    { path: "/team", label: "Team", icon: Users },
    { path: "/hiring", label: "Hiring", icon: UserPlus },
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  // Mobile Navigation
  if (isMobile) {
    return (
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <img src={cmLogo} alt="CM Logo" className="h-8 w-auto" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100%-65px)]">
                  <div className="flex-1 py-4">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                            "hover:bg-muted",
                            isActive
                              ? "text-primary bg-muted"
                              : "text-muted-foreground",
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t p-4">
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center">
              <img src={cmLogo} alt="CM Logo" className="h-8 w-auto" />
            </Link>

            {/* Profile dropdown */}
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
                <DropdownMenuItem asChild>
                  <Link to="/users" onClick={handleNavClick} className="flex items-center gap-2 cursor-pointer">
                    <UserCog className="h-4 w-4" />
                    Members
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    );
  }

  // Desktop Navigation
  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center shrink-0">
            <img src={cmLogo} alt="CM Logo" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative",
                    "hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </Link>
              );
            })}
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
              <DropdownMenuItem asChild>
                <Link to="/users" className="flex items-center gap-2 cursor-pointer">
                  <UserCog className="h-4 w-4" />
                  Members
                </Link>
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
