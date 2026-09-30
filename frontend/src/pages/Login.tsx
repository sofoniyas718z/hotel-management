import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bed, Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type Role = "customer" | "admin" | "reception";

interface RoleFormState {
  email: string;
  password: string;
}

const INITIAL_CREDENTIALS: Record<Role, RoleFormState> = {
  customer: { email: "", password: "" },
  admin: { email: "", password: "" },
  reception: { email: "", password: "" },
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [activeRole, setActiveRole] = useState<Role>("customer");
  const [credentials, setCredentials] = useState(INITIAL_CREDENTIALS);
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null);
  const [showPassword, setShowPassword] = useState<Record<Role, boolean>>({
    customer: false,
    admin: false,
    reception: false,
  });

  const handleInputChange = (role: Role, field: keyof RoleFormState, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const redirectAfterLogin = (role: Role) => {
    const fallback =
      role === "admin" ? "/admin" : role === "reception" ? "/reception" : "/customer-dashboard";
    const from = (location.state as { from?: Location })?.from?.pathname;
    navigate(from || fallback, { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent, role: Role) => {
    event.preventDefault();
    const formData = credentials[role];

    try {
      setSubmittingRole(role);
      await login({ email: formData.email, password: formData.password, role });
        toast({
        title: "Login Successful",
        description: `Welcome back! Redirecting to your ${role} dashboard...`,
        });
      redirectAfterLogin(role);
    } catch (error) {
      toast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Unable to login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRole(null);
    }
  };

  const renderForm = (role: Role, label: string) => (
    <form className="space-y-4" onSubmit={(event) => handleSubmit(event, role)}>
      <div className="space-y-2">
        <Label htmlFor={`${role}-email`}>Email</Label>
        <Input
          id={`${role}-email`}
          type="email"
          placeholder={`${role}@safarilodge.com`}
          value={credentials[role].email}
          onChange={(event) => handleInputChange(role, "email", event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${role}-password`}>Password</Label>
        <div className="relative">
          <Input
            id={`${role}-password`}
            type={showPassword[role] ? "text" : "password"}
            placeholder="••••••••"
            value={credentials[role].password}
            onChange={(event) => handleInputChange(role, "password", event.target.value)}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(prev => ({ ...prev, [role]: !prev[role] }))}
            aria-label={showPassword[role] ? "Hide password" : "Show password"}
          >
            {showPassword[role] ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        variant="hero"
        className="w-full"
        size="lg"
        disabled={submittingRole === role}
      >
        {submittingRole === role ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Logging in...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            {label}
          </>
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center space-x-2 mb-8 group">
          <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center transition-smooth group-hover:shadow-elegant">
            <Bed className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            SafariLodge
          </span>
        </Link>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Welcome Back</CardTitle>
            <CardDescription>Login to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeRole}
              className="w-full"
              onValueChange={(value) => setActiveRole(value as Role)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customer">Customer</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="reception">Reception</TabsTrigger>
              </TabsList>

              <TabsContent value="customer" className="space-y-4 mt-6">
                {renderForm("customer", "Login as Customer")}
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-6">
                {renderForm("admin", "Login as Admin")}
              </TabsContent>

              <TabsContent value="reception" className="space-y-4 mt-6">
                {renderForm("reception", "Login as Reception")}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              <Link to="/" className="text-primary hover:underline font-medium">
                Back to Home
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;