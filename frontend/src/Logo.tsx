import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ 
  className = "", 
  showText = true, 
  size = "md" 
}: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl"
  };

  const imageSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <Link 
      to="/" 
      className={`flex items-center space-x-3 hover:opacity-80 transition-opacity ${className}`}
    >
      {/* Using your actual image */}
      <img 
        src="/logo.jpg" 
        alt="Lovable Hotel"
        className={`${imageSizes[size]} object-cover rounded-lg`}
      />
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-900 ${textSizes[size]}`}>
            Lovable Hotel
          </span>
          <span className="text-xs text-gray-500">
            Luxury Experience
          </span>
        </div>
      )}
    </Link>
  );
};