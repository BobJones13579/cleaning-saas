import type { Metadata } from 'next'
import './globals.css'
import Navbar from "@/components/Navbar";
import { StagewiseToolbar } from '@stagewise/toolbar-next';
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

const stagewiseConfig = { plugins: [] };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'development' && (
          <StagewiseToolbar config={stagewiseConfig} />
        )}
      </body>
    </html>
  )
}
