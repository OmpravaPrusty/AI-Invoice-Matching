import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * PasswordInput - Reusable password field component with toggle visibility
 *
 * Features:
 * - Eye icon toggle to show/hide password
 * - Integrated form field styling with Tailwind
 * - Accessibility-friendly with proper ARIA labels
 * - Supports all standard input props
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current password value
 * @param {Function} props.onChange - Change event handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Is field required
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text for the field
 * @param {string} props.id - Unique identifier for the input
 * @param {string} props.name - Name attribute for form submission (default: "password")
 * @returns {JSX.Element} Password input component
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password",
  required = false,
  className = "",
  label = "Password",
  id = "password-input",
  name = "password",
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`input-base pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
          aria-label={isVisible ? "Hide password" : "Show password"}
          tabIndex={0}
        >
          {isVisible ? (
            <EyeOff size={20} className="text-slate-500 hover:text-slate-700" />
          ) : (
            <Eye size={20} className="text-slate-500 hover:text-slate-700" />
          )}
        </button>
      </div>
    </div>
  );
}
