import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginUser } from "../../services/auth";
import "../styles/Auth.css";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      });

      if (!response.success || !response.user) {
        setLoginError(response.error || "Login failed");
        return;
      }

      switch (response.user.role) {
        case "admin":
          navigate("/admin");
          break;
        case "student":
          navigate("/student");
          break;
        case "teacher":
          navigate("/teacher");
          break;
        case "staff":
          navigate("/staff");
          break;
        default:
          setLoginError("Unknown user role");
      }
    } catch (error) {
      setLoginError("An error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background"></div>

      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">📚</div>
            </div>

            <h1 className="auth-title">Student Management</h1>
            <p className="auth-subtitle">Modern University Portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {loginError && (
              <div className="error-alert" role="alert">
                <span className="error-icon">⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>

              <div className="input-wrapper">
                <span className="input-icon">✉️</span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={`form-input ${errors.email ? "input-error" : ""}`}
                  {...register("email")}
                  disabled={isLoading}
                />
              </div>

              {errors.email && (
                <span className="error-message">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>

              <div className="input-wrapper">
                <span className="input-icon">🔒</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={`form-input ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>

              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-prompt">
              Don't have an account?{" "}
              <a href="/register" className="auth-link">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;