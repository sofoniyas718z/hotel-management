import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Checking permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleDashboard: Record<string, string> = {
      'customer': '/customer-dashboard',
      'admin': '/admin', // admin (formerly staff) uses staff dashboard for room cleaning
      'reception': '/reception', // reception (formerly admin) uses admin dashboard
    };
    const redirectTo = roleDashboard[user.role] || '/';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

