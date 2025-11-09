export default function Logo({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full bg-[#5A4BFF] flex items-center justify-center text-white font-bold shadow-md`}
    >
      CS
    </div>
  );
}

