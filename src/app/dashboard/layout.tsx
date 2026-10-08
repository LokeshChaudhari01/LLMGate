"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin-login");
  };

  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Routing Analytics", path: "/dashboard/analytics" },
    { name: "Tenants", path: "/dashboard/tenants" },
    { name: "API Keys", path: "/dashboard/keys" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col md:fixed md:h-full">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            LLMGate
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Admin Dashboard</p>
        </div>
        
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto p-3 md:block md:flex-1 md:space-y-1 md:p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`block shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800 md:p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full min-w-0 md:ml-64 flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
