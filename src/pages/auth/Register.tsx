import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerUser, type RegisterCredentials } from "../../services/auth";
import type { User } from "../../types/user";
import "../styles/Auth.css";

// Validation schema
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["student", "teacher", "staff"] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setRegistrationError(null);

    try {
      const credentials: RegisterCredentials = {
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: data.role,
      };

      const response = await registerUser(credentials);

      if (response.success && response.user) {
        // Pass the registered user to the pending approval page
        const registeredUser = response.user as User;
        navigate("/pending-approval", {
          state: {
            user: registeredUser,
          },
        });
      } else {
        setRegistrationError(response.error || "Registration failed");
      }
    } catch (error) {
      setRegistrationError("An error occurred. Please try again.");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background"></div>

      <div className="auth-wrapper">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">📚</div>
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join the Student Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Error Alert */}
            {registrationError && (
              <div className="error-alert" role="alert">
                <span className="error-icon">⚠️</span>
                <span>{registrationError}</span>
              </div>
            )}

            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className={`form-input ${errors.name ? "input-error" : ""}`}
                  {...register("name")}
                  disabled={isLoading}
                />
              </div>
              {errors.name && (
                <span className="error-message">{errors.name.message}</span>
              )}
            </div>

            {/* Email Field */}
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

            {/* Role Dropdown */}
            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <div className="input-wrapper">
                <span className="input-icon">👨‍💼</span>
                <select
                  id="role"
                  className={`form-input form-select ${
                    errors.role ? "input-error" : ""
                  }`}
                  {...register("role")}
                  disabled={isLoading}
                >
                  <option value="">Select your role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              {errors.role && (
                <span className="error-message">{errors.role.message}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className={`form-input ${
                    errors.password ? "input-error" : ""
                  }`}
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
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
              <div className="password-hint">
                <small>
                  Must be at least 8 characters with uppercase, lowercase, and
                  number
                </small>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className={`form-input ${
                    errors.confirmPassword ? "input-error" : ""
                  }`}
                  {...register("confirmPassword")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="error-message">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p className="auth-prompt">
              Already have an account?{" "}
              <a href="/" className="auth-link">
                Sign in here
              </a>
            </p>
          </div>

          {/* Terms */}
          <div className="auth-terms">
            <small>
              By registering, you agree to our Terms of Service and Privacy
              Policy.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
