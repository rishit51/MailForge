import {
  LayoutDashboard,
  Send,
  Database,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  Zap
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function Sidebar() {

  const navigate = useNavigate()
  const location = useLocation()
  const {logout} = useAuth();
  const navItems = [

    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard"
    },

    {
      label: "Campaigns",
      icon: Send,
      path: "/campaigns/new"
    },

    {
      label: "Data Sources",
      icon: Database,
      path: "/datasets"
    },

    {
      label: "Email Accounts",
      icon: Mail,
      path: "/accounts"
    },

    {
      label: "Analytics",
      icon: BarChart3,
      path: "/analytics"
    },

    {
      label: "Settings",
      icon: Settings,
      path: "/settings"
    }

  ];

  return (

    <div className="hidden md:flex w-64 flex-col bg-card border-r border-border h-screen sticky top-0">

      <div className="p-6 flex items-center gap-2 border-b border-border/50">

        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>

        <span className="text-xl font-bold tracking-tight">
          MailForge
        </span>

      </div>



      <nav className="flex-1 px-3 py-6 space-y-1">

        {navItems.map((item) => {

          const Icon = item.icon

          const isActive =
            location.pathname === item.path

          return (

            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >

              <Icon
                className={`h-5 w-5 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />

              {item.label}

            </button>

          )

        })}

      </nav>



      <div className="p-4 border-t border-border/50">

        <button  onClick={() =>{console.log('Logout clicked');logout()}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">

          <LogOut  className="h-5 w-5" />

          Sign Out

        </button>

      </div>

    </div>

  )
}
