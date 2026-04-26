import Link from 'next/link';

export function TalentSyncLogo({ className = "", size = "default" }: { className?: string, size?: "small" | "default" | "large" }) {
    const sizeClasses = {
        small: "w-6 h-6 text-sm",
        default: "w-8 h-8 text-lg",
        large: "w-10 h-10 text-xl"
    };

    return (
        <Link href="/" className={`flex items-center space-x-2 ${className}`}>
            <div className={`${sizeClasses[size].split(" ")[0]} ${sizeClasses[size].split(" ")[1]} bg-blue-600 rounded-lg flex items-center justify-center`}>
                <span className={`text-white font-bold ${sizeClasses[size].split(" ")[2]}`}>L</span>
            </div>
            <span className={`font-bold text-slate-900 tracking-tight ${size === 'large' ? 'text-2xl' : size === 'small' ? 'text-base' : 'text-xl'}`}>
                TalentSync
            </span>
        </Link>
    );
}
