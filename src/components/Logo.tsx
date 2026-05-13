export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <img 
      src="https://res.cloudinary.com/dlfzzfdx0/image/upload/v1777286182/Brand_title_with_tagline-removebg-preview_jpjpet.png" 
      alt="Proteccio" 
      className={className}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo />
    </div>
  );
}
