"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/clients", label: "Clients" },
  { href: "/cleaners", label: "Cleaners" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  async function handleLogout() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out", description: "You have been logged out." });
      router.replace("/login");
    } catch (err: any) {
      toast({ title: "Logout failed", description: err.message || String(err), variant: "destructive" });
    }
    setLoading(false);
    setLogoutDialogOpen(false);
  }

  return (
    <nav className="w-full bg-white border border-gray-100 shadow-sm rounded-b-xl px-2 sm:px-4 py-3 mb-4">
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto gap-2 sm:gap-0">
        <div className="flex items-center gap-4 mb-2 sm:mb-0 w-full sm:w-auto justify-between">
          <span className="text-2xl font-extrabold tracking-tight text-blue-700">CleanOps</span>
          <button className="sm:hidden p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 transition shadow-sm" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation menu">
            <Menu className="w-7 h-7 text-blue-700" />
          </button>
        </div>
        <div className={`flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-center w-full sm:w-auto ${menuOpen ? 'flex' : 'hidden'} sm:flex mt-2 sm:mt-0`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg font-semibold text-sm sm:text-base transition w-full sm:w-auto text-center border border-transparent hover:bg-blue-50 focus:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200 ${pathname === link.href ? "bg-blue-100 text-blue-700 border-blue-200" : "text-gray-700"}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {session ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                Logged in as {session.user?.email || "user"}
              </span>
              <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="px-3 py-2 rounded-lg border border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:border-red-400 focus:bg-red-100 focus:border-red-400 font-medium text-sm transition w-full sm:w-auto shadow-none focus:outline-none focus:ring-2 focus:ring-red-200"
                    disabled={loading}
                    type="button"
                  >
                    {loading ? "Logging out..." : "Logout"}
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Logout</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to log out?</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLogoutDialogOpen(false)} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleLogout} disabled={loading}>
                      {loading ? "Logging out..." : "Logout"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg font-semibold text-sm sm:text-base transition w-full sm:w-auto text-center border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 