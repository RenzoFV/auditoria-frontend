"use client";

import {
  FileText,
  Gauge,
  Menu,
  Shield,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Panel", icon: Gauge, href: "/" },
  { label: "Reportes", icon: FileText, href: "/reportes" },
];

function SidebarNav({ className, onItemClick }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (item) => {
    if (item.href) {
      router.push(item.href);
    }
    if (onItemClick) {
      onItemClick(item.label);
    }
  };

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Button
            key={item.label}
            variant={isActive ? "secondary" : "ghost"}
            className="h-11 justify-start gap-3"
            onClick={() => handleClick(item)}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-sm">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">AuditDB Analyzer</p>
          <p className="text-xs text-muted-foreground">Hass Peru</p>
        </div>
      </div>
      <Badge variant="outline">v1</Badge>
    </div>
  );
}

function SidebarUser() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-12 justify-start gap-3 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatar.png" alt="Usuario" />
            <AvatarFallback>RF</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium">Renzo Florian</p>
            <p className="text-xs text-muted-foreground">Auditor principal</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52" align="start">
        <DropdownMenuItem>Perfil</DropdownMenuItem>
        <DropdownMenuItem>Preferencias</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Cerrar sesion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarDesktop({ onItemClick }) {
  return (
    <aside className="hidden border-r bg-card/80 p-6 lg:flex lg:flex-col">
      <SidebarHeader />
      <Separator className="my-6" />
      <SidebarNav className="flex-1" onItemClick={onItemClick} />
      <Separator className="my-6" />
      <SidebarUser />
    </aside>
  );
}

function SidebarMobile({ onItemClick }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 px-4">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-6">
          <SidebarHeader />
          <Separator />
          <SidebarNav onItemClick={onItemClick} />
          <Separator />
          <SidebarUser />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SidebarLayout({ children, onNavItemClick }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_45%),radial-gradient(circle_at_20%_20%,_rgba(251,191,36,0.12),_transparent_40%)]" />
        <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
          <SidebarDesktop onItemClick={onNavItemClick} />
          <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <SidebarMobile onItemClick={onNavItemClick} />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Panel principal
                  </p>
                  <h1 className="font-display text-2xl font-semibold">
                    Auditoria Hass Peru
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Conexion activa</Badge>
                <Button variant="outline">Nueva auditoria</Button>
              </div>
            </header>
            <main className="flex-1 px-6 pb-10 pt-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
