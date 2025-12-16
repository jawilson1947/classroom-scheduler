"use client";

import { ThemeProvider } from "@material-tailwind/react";

export function MTThemeProvider({ children }: { children: React.ReactNode }) {
    // ThemeProvider temporarily disabled due to React 19 Recursion Loop
    return <>{children}</>;
}
