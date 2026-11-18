/// <reference types="vite/client" />
import React from "react";

declare global {
    interface Window {
        // Wallpaper Engine's, when the map viewer runs as a wallpaper
        wallpaperRegisterAudioListener: any;

        wallpaperPropertyListener: any;

        wallpaperFpsLimit?: number;
    }
}

// memo keeps the component's own type, generics and all
declare module "react" {
    function memo<T extends React.ComponentType<any>>(
        c: T,
        areEqual?: (
            prev: Readonly<React.ComponentProps<T>>,
            next: Readonly<React.ComponentProps<T>>,
        ) => boolean,
    ): T;
}
