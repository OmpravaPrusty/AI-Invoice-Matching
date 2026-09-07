import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/ui/PasswordInput";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await login(form.email, form.password);
      setSuccess("Login successful");
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">⚡</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              AI Matching Hub
            </h1>
            <p className="text-slate-600">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="input-base w-full"
              />
            </div>

            {/* Password Field */}
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 font-semibold text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-sm text-slate-500">
              Don't have an account?
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="block w-full text-center btn-secondary py-3 font-semibold"
          >
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          © 2024 AI Matching Hub. All rights reserved.
        </p>
      </div>
    </div>
  );
}
