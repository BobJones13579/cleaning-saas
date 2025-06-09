import { ReactNode } from "react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "./ui/card";

interface EntityCardProps {
  headerIcon?: ReactNode;
  title: ReactNode;
  badges?: ReactNode[];
  mainInfo: ReactNode;
  actions: ReactNode;
  className?: string;
}

export default function EntityCard({ headerIcon, title, badges, mainInfo, actions, className }: EntityCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all duration-200 hover:shadow-xl bg-white border border-gray-200 rounded-2xl p-0 shadow-lg w-full ${className || ""}`}
      style={{ fontFamily: 'Inter, Roboto, Arial, sans-serif', fontSize: '1.08rem' }}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2 pt-5 px-7">
        {headerIcon && <div className="flex-shrink-0 text-blue-600">{headerIcon}</div>}
        <CardTitle className="text-xl font-extrabold text-gray-900 tracking-tight truncate" style={{maxWidth: '100%'}}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-7">
        {mainInfo}
      </CardContent>
      {badges && badges.length > 0 && (
        <div className="flex flex-row gap-2 items-center px-7 pb-1">
          <span className="px-4 py-1 text-sm font-bold rounded-full tracking-wide shadow-sm border-0 bg-green-100 text-green-800" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {badges[0]}
          </span>
        </div>
      )}
      <CardFooter className="flex gap-3 justify-end pt-2 pb-5 px-7">
        {actions}
      </CardFooter>
    </Card>
  );
} 